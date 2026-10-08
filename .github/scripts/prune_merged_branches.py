#!/usr/bin/env python3
"""Remove only safely merged/reachable branches with an exact-SHA deletion lease.

Dry-run by default. Requires --apply for writes. Never deletes main, protected
branches, open PR heads/bases, or branches with unique unmerged commits.
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from collections import Counter

REPO = "mycomind4-arch/mailmypdf-all"

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

def classify(branch, prs, main_sha, token):
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
        verdict, reason = classify(b, prs, main_sha, token)
        verdicts.append((b["name"], b["commit"]["sha"], verdict, reason))
    eligible = [(name, sha) for name, sha, verdict, _ in verdicts if verdict == "delete"]
    counts = Counter(verdict for _, _, verdict, _ in verdicts)
    print(f"Repository={REPO}; branches={len(branches)}; eligible={len(eligible)}; preserved={counts['preserve']}; apply={apply}")
    for name, sha, verdict, reason in verdicts:
        print(f"{verdict.upper():8} {name} {sha[:12]}: {reason}")
    if not apply:
        print("DRY RUN: No remote refs changed")
        return 0
    failures = 0
    for name, sha in eligible:
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
