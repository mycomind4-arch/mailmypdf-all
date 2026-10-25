#!/usr/bin/env python3
"""Remove only safely merged/reachable branches with an exact-SHA deletion lease.

Dry-run by default. Requires --apply for writes. Never deletes main, protected
branches, open PR heads/bases, or branches with unique unmerged commits.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request
from collections import Counter

REPO = "mycomind4-arch/mailmypdf-all"

def load_retirements():
    path = Path(__file__).with_name("reviewed_branch_retirements.json")
    if not path.exists():
        return {}
    data = json.loads(path.read_text())
    if data.get("version") != 1 or not isinstance(data.get("retirements"), list):
        raise RuntimeError("Invalid reviewed-retirement manifest")
    result = {}
    for entry in data["retirements"]:
        name = entry.get("branch")
        if not isinstance(name, str) or name == "main" or name in result:
            raise RuntimeError("Invalid or duplicate reviewed branch")
        for field in ("sha", "audited_main_sha"):
            if not re.fullmatch(r"[0-9a-f]{40}", entry.get(field, "")):
                raise RuntimeError("Invalid reviewed commit SHA")
        tag = entry.get("archive_tag", "")
        if not tag.startswith("archive/branch-cleanup-") or not tag.endswith("/" + name):
            raise RuntimeError("Invalid reviewed archive tag")
        if subprocess.run(["git", "check-ref-format", "refs/tags/" + tag], capture_output=True).returncode:
            raise RuntimeError("Invalid archive ref")
        blobs = entry.get("main_blobs")
        if not isinstance(blobs, dict) or not blobs or not entry.get("reason"):
            raise RuntimeError("Missing reviewed content evidence")
        for filename, sha in blobs.items():
            if not isinstance(filename, str) or filename.startswith("/") or ".." in filename.split("/") or not re.fullmatch(r"[0-9a-f]{40}", sha):
                raise RuntimeError("Invalid reviewed blob evidence")
        result[name] = entry
    return result

def reviewed_retirement_matches(entry, sha, main_sha):
    # Manual patch review is pinned to the exact branch tip and main content.
    # A moved branch, a rewritten main, or changed evidence requires new review.
    if entry.get("sha") != sha:
        return False
    ancestor = subprocess.run(
        ["git", "merge-base", "--is-ancestor", entry["audited_main_sha"], main_sha],
        capture_output=True,
    )
    if ancestor.returncode:
        return False
    for filename, expected in entry["main_blobs"].items():
        blob = subprocess.run(
            ["git", "rev-parse", "--verify", main_sha + ":" + filename],
            capture_output=True, text=True,
        )
        if blob.returncode or blob.stdout.strip() != expected:
            return False
    return True

def archive_exact_tip(entry):
    ref = "refs/tags/" + entry["archive_tag"]
    sha = entry["sha"]
    def remote_sha():
        result = subprocess.run(["git", "ls-remote", "--refs", "origin", ref], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError("Unable to verify archive ref")
        rows = [line.split() for line in result.stdout.splitlines() if line.strip()]
        if not rows:
            return None
        if len(rows) != 1 or len(rows[0]) != 2 or rows[0][1] != ref:
            raise RuntimeError("Invalid archive ref response")
        return rows[0][0]
    existing = remote_sha()
    if existing is not None:
        return existing == sha
    # Empty expected SHA refuses to overwrite a concurrently created tag.
    result = subprocess.run(
        ["git", "push", "--force-with-lease=" + ref + ":", "origin", sha + ":" + ref],
        capture_output=True, text=True,
    )
    return result.returncode == 0 and remote_sha() == sha

def api(path, token):
    request = urllib.request.Request(
        "https://api.github.com/repos/" + REPO + path,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": "Bearer " + token,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "mailmypdf-safe-branch-pruner",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)

def all_pages(path, token):
    results = []
    for page in range(1, 21):
        sep = "&" if "?" in path else "?"
        part = api(f"{path}{sep}per_page=100&page={page}", token)
        if not isinstance(part, list):
            raise RuntimeError("Invalid GitHub pagination result")
        results.extend(part)
        if len(part) < 100:
            return results
    raise RuntimeError("Pagination cap exceeded")

def classify(branch, prs, main_sha, token, retirements=None):
    name = branch.get("name")
    sha = (branch.get("commit") or {}).get("sha")
    if not name or not sha:
        return "preserve", "missing name or SHA"
    if name == "main" or branch.get("protected"):
        return "preserve", "main or protected"
    related = prs.get(name, ())
    if any(pr.get("state") == "open" for pr in related):
        return "preserve", "open PR head or base"
    if any(pr.get("merged_at") and (pr.get("head") or {}).get("sha") == sha for pr in related):
        return "delete", "merged PR at matching SHA"
    try:
        data = api(f"/compare/{main_sha}...{sha}", token)
    except (urllib.error.URLError, ValueError):
        return "preserve", "comparison failed"
    if data.get("ahead_by") == 0 and data.get("too_large") is not True:
        return "delete", "head reachable from main"
    entry = (retirements or {}).get(name)
    if entry and reviewed_retirement_matches(entry, sha, main_sha):
        return "archive-delete", "reviewed superseded content; archive required"
    return "preserve", "unique/unverified commits"

def delete_with_lease(name, sha):
    ref = "refs/heads/" + name
    # The lease prevents deletion if a branch moves since the audit.
    return subprocess.run(
        ["git", "push", f"--force-with-lease={ref}:{sha}", "origin", f":{ref}"],
        capture_output=True, text=True, check=False,
    )

def run(apply):
    token = os.environ.get("GITHUB_TOKEN")
    if os.environ.get("GITHUB_REPOSITORY") != REPO or not token:
        raise RuntimeError("Wrong repository or missing GitHub token")
    branches = all_pages("/branches", token)
    pull_requests = all_pages("/pulls?state=all", token)
    branch_map = {b["name"]: b for b in branches}
    if "main" not in branch_map:
        raise RuntimeError("Default branch main missing")
    main_sha = branch_map["main"]["commit"]["sha"]
    retirements = load_retirements()
    if retirements:
        # Checkout uses full history. Pin the live main object before checking
        # evidence, in case another commit arrived after checkout.
        fetched = subprocess.run(["git", "fetch", "--no-tags", "origin", main_sha], capture_output=True)
        if fetched.returncode:
            raise RuntimeError("Cannot fetch current main for retirement verification")
    prs = {}
    for pr in pull_requests:
        head = pr.get("head") or {}
        if (head.get("repo") or {}).get("full_name") == REPO and head.get("ref"):
            prs.setdefault(head["ref"], []).append(pr)
        # Protect any branch serving as the base of an open stacked PR.
        base = pr.get("base") or {}
        if pr.get("state") == "open" and (base.get("repo") or {}).get("full_name") == REPO and base.get("ref"):
            prs.setdefault(base["ref"], []).append(pr)
    verdicts = []
    for b in branches:
        verdict, reason = classify(b, prs, main_sha, token, retirements)
        verdicts.append((b["name"], b["commit"]["sha"], verdict, reason))
    eligible = [(name, sha, verdict) for name, sha, verdict, _ in verdicts if verdict in ("delete", "archive-delete")]
    counts = Counter(verdict for _, _, verdict, _ in verdicts)
    print(f"Repository={REPO}; branches={len(branches)}; eligible={len(eligible)}; preserved={counts['preserve']}; apply={apply}")
    for name, sha, verdict, reason in verdicts:
        print(f"{verdict.upper():8} {name} {sha[:12]}: {reason}")
    if not apply:
        print("DRY RUN: No remote refs changed")
        return 0
    failures = 0
    for name, sha, verdict in eligible:
        if verdict == "archive-delete":
            try:
                archived = archive_exact_tip(retirements[name])
            except RuntimeError:
                archived = False
            if not archived:
                failures += 1
                print(f"SKIPPED {name}: durable exact-tip archive not verified")
                continue
            print(f"ARCHIVED {name} as {retirements[name]['archive_tag']}")
        result = delete_with_lease(name, sha)
        if result.returncode:
            failures += 1
            print(f"SKIPPED {name}: {result.stderr.strip()[-200:]}")
        else:
            print(f"DELETED {name}")
    print(f"Deleted {len(eligible) - failures}, refused/skipped {failures}")
    return int(failures != 0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        sys.exit(run(args.apply))
    except Exception as error:
        print(f"ERROR: {error}; fail closed", file=sys.stderr)
        sys.exit(1)
