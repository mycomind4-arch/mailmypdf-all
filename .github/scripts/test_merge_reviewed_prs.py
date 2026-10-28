import importlib.util
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    "merge_reviewed_prs", Path(__file__).with_name("merge_reviewed_prs.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MergeGateTests(unittest.TestCase):
    def setUp(self):
        self.protection = {
            "required_pull_request_reviews": {
                "required_approving_review_count": 1,
                "dismiss_stale_reviews": True,
            },
            "required_status_checks": {"strict": True, "checks": [{"context": "verify"}]},
            "required_conversation_resolution": {"enabled": True},
            "enforce_admins": {"enabled": True},
        }
        self.pr = {
            "number": 12,
            "author": {"login": "owner"},
            "headRefName": "fix/safe-workflow",
            "headRefOid": "newhead",
            "headRepositoryOwner": {"login": "owner"},
            "baseRefName": "main",
            "baseRefOid": "mainsha",
            "isDraft": False,
            "mergeable": "MERGEABLE",
            "reviewDecision": "APPROVED",
            "statusCheckRollup": [
                {"status": "COMPLETED", "conclusion": "SUCCESS"},
            ],
        }
        self.reviews = [{
            "user": {"login": "reviewer"},
            "state": "APPROVED",
            "commit_id": "newhead",
            "author_association": "COLLABORATOR",
        }]

    def eligible(self, files=None):
        return module.eligible(
            self.pr, "owner", "mainsha", self.reviews,
            files if files is not None else ["appeal-mail/workflows/example/start/index.tsx"],
        )

    def test_safe_current_reviewed_pr_is_eligible(self):
        self.assertTrue(module.protection_ready(self.protection))
        self.assertTrue(self.eligible())

    def test_missing_any_release_protection_pauses(self):
        for section, field in [
            ("required_pull_request_reviews", "dismiss_stale_reviews"),
            ("required_status_checks", "strict"),
            ("required_conversation_resolution", "enabled"),
            ("enforce_admins", "enabled"),
        ]:
            with self.subTest(section=section):
                changed = {key: dict(value) for key, value in self.protection.items()}
                changed[section][field] = False
                self.assertFalse(module.protection_ready(changed))
        self.protection["required_status_checks"]["checks"] = []
        self.assertFalse(module.protection_ready(self.protection))

    def test_stale_or_self_approval_does_not_count(self):
        self.reviews[0]["commit_id"] = "oldhead"
        self.assertFalse(self.eligible())
        self.reviews[0]["commit_id"] = "newhead"
        self.reviews[0]["user"]["login"] = "owner"
        self.assertFalse(self.eligible())

    def test_change_request_blocks_even_with_another_approval(self):
        self.reviews.append({
            "user": {"login": "second-reviewer"},
            "state": "CHANGES_REQUESTED",
            "commit_id": "newhead",
            "author_association": "COLLABORATOR",
        })
        self.assertFalse(self.eligible())

    def test_missing_failed_or_pending_checks_block(self):
        for checks in [[], [{"status": "COMPLETED", "conclusion": "FAILURE"}],
                       [{"status": "IN_PROGRESS", "conclusion": None}]]:
            with self.subTest(checks=checks):
                self.pr["statusCheckRollup"] = checks
                self.assertFalse(self.eligible())

    def test_stale_base_draft_and_foreign_author_block(self):
        self.pr["baseRefOid"] = "oldmain"
        self.assertFalse(self.eligible())
        self.pr["baseRefOid"] = "mainsha"
        self.pr["isDraft"] = True
        self.assertFalse(self.eligible())
        self.pr["isDraft"] = False
        self.pr["author"]["login"] = "outsider"
        self.assertFalse(self.eligible())

    def test_sensitive_paths_block(self):
        for path in [
            ".github/workflows/deploy-mailmypdf.yml",
            "mailmypdf/deploy.sh",
            "mailmypdf/src/lib/payment.ts",
            "mailmypdf/supabase/migrations/001.sql",
            "mailmypdf/.env.local",
            "pnpm-lock.yaml",
        ]:
            with self.subTest(path=path):
                self.assertFalse(self.eligible([path]))

if __name__ == "__main__":
    unittest.main()
