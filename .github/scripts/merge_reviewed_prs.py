#!/usr/bin/env python3
"""Merge one owner-authorized PR only when repository release gates prove it safe."""

import json
import os
import re
import subprocess
import sys


SENSITIVE = re.compile(
    r"(^\.github/|^\.agents/|^\.claude/|(^|/)(AGENTS|CLAUDE)\.md$|"
    r"(^|/)supabase/|(^|/)migrations/|(^|/)(deploy\.sh|wrangler[^/]*)$|"
    r"(^|/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$|"
    r"(^|/)\.env(\.|$)|secret|stripe|payment|fulfillment|lob|mailing-client)",
    re.IGNORECASE,
)
TRUSTED_REVIEWERS = {"OWNER", "MEMBER", "COLLABORATOR"}


def gh(*args):
    result = subprocess.run(["gh", *args], check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def protection_ready(protection):
    reviews = protection.get("required_pull_request_reviews") or {}
    checks = protection.get("required_status_checks") or {}
    return (
        reviews.get("required_approving_review_count", 0) >= 1
        and reviews.get("dismiss_stale_reviews") is True
        and checks.get("strict") is True
        and bool(checks.get("checks") or checks.get("contexts"))
        and (protection.get("required_conversation_resolution") or {}).get("enabled") is True
        and (protection.get("enforce_admins") or {}).get("enabled") is True
    )


def fresh_independent_approval(reviews, head_sha, author):
    latest = {}
    for review in reviews:
        login = (review.get("user") or {}).get("login")
        if login:
            latest[login] = review
    if any(review.get("state") == "CHANGES_REQUESTED" for review in latest.values()):
        return False
    return any(
        login != author
        and review.get("state") == "APPROVED"
        and review.get("commit_id") == head_sha
        and review.get("author_association") in TRUSTED_REVIEWERS
        for login, review in latest.items()
    )


def checks_green(checks):
    return bool(checks) and all(
        check.get("status") == "COMPLETED" and check.get("conclusion") == "SUCCESS"
        for check in checks
    )


def changed_files(repo, number):
    names = []
    page = 1
    while True:
        files = gh("api", f"repos/{repo}/pulls/{number}/files?per_page=100&page={page}")
        names.extend(item["filename"] for item in files)
        if len(files) < 100:
            return names
        page += 1


def eligible(pr, owner, main_sha, reviews, files):
    author = (pr.get("author") or {}).get("login", "")
    branch = pr.get("headRefName", "")
    agent_branch = re.fullmatch(r"cloud-agent/issue-[1-9][0-9]*", branch) is not None
    authorized_author = author == owner or (agent_branch and author == "github-actions[bot]")
    safe_files = bool(files) and not any(SENSITIVE.search(path) for path in files)
    return (
        authorized_author
        and pr.get("baseRefName") == "main"
        and pr.get("baseRefOid") == main_sha
        and (pr.get("headRepositoryOwner") or {}).get("login") == owner
        and not pr.get("isDraft")
        and pr.get("mergeable") == "MERGEABLE"
        and pr.get("reviewDecision") == "APPROVED"
        and checks_green(pr.get("statusCheckRollup"))
        and fresh_independent_approval(reviews, pr.get("headRefOid"), author)
        and safe_files
    )


def run():
    repo = os.environ["GITHUB_REPOSITORY"]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ValueError("Invalid repository identity")
    owner = repo.split("/", 1)[0]
    try:
        protection = gh("api", f"repos/{repo}/branches/main/protection")
    except subprocess.CalledProcessError as error:
        if "HTTP 404" in error.stderr or '"status":"404"' in error.stderr:
            print("No main branch protection; automatic merges are paused.")
            return
        raise
    if not protection_ready(protection):
        print("Main protection lacks required reviews, fresh approvals, strict CI, conversation resolution, or admin enforcement; automatic merges are paused.")
        return
    main_sha = gh("api", f"repos/{repo}/branches/main")["commit"]["sha"]
    prs = gh(
        "pr", "list", "-R", repo, "--state", "open", "--limit", "100",
        "--json", "number,author,headRefName,headRefOid,headRepositoryOwner,baseRefName,baseRefOid,isDraft,mergeable,reviewDecision,statusCheckRollup",
    )
    if len(prs) == 100:
        print("PR inventory reached its page limit; automatic merges are paused.")
        return
    for pr in sorted(prs, key=lambda item: item["number"]):
        number = pr["number"]
        reviews = gh("api", f"repos/{repo}/pulls/{number}/reviews?per_page=100")
        if len(reviews) == 100:
            print(f"PR #{number}: review inventory reached its page limit; skipping.")
            continue
        files = changed_files(repo, number)
        if not eligible(pr, owner, main_sha, reviews, files):
            continue
        match = re.fullmatch(r"cloud-agent/issue-([1-9][0-9]*)", pr["headRefName"])
        if match:
            issue = gh("api", f"repos/{repo}/issues/{match.group(1)}")
            if issue.get("state") != "open" or issue.get("user", {}).get("login") != owner or not issue.get("title", "").startswith("[Cloud Agent]"):
                continue
        # The expected head SHA makes GitHub reject a concurrent push. GitHub
        # independently enforces every main protection rule at merge time.
        result = gh(
            "api", "--method", "PUT", f"repos/{repo}/pulls/{number}/merge",
            "-f", f"sha={pr['headRefOid']}", "-f", "merge_method=squash",
        )
        if not result.get("merged"):
            raise RuntimeError(f"GitHub did not merge PR #{number}")
        print(f"Merged PR #{number} into main as {result['sha']}.")
        return  # Reevaluate the new main and its CI before another merge.
    print("No reviewed, CI-green, safe PR is ready to merge.")


if __name__ == "__main__":
    try:
        run()
    except (subprocess.CalledProcessError, KeyError, ValueError, RuntimeError) as error:
        print(f"Automatic merge stopped: {error}", file=sys.stderr)
        sys.exit(1)
