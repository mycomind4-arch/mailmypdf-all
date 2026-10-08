"""Regression checks for destructive branch cleanup's preservation boundaries."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("pruner", Path(__file__).with_name("prune_merged_branches.py"))
pruner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pruner)

SHA = "a" * 40
MAIN = "b" * 40
ENTRY = {"branch": "old", "sha": SHA, "audited_main_sha": MAIN,
         "archive_tag": "archive/branch-cleanup-2026-10-08/old",
         "main_blobs": {"README.md": "c" * 40}, "reason": "reviewed"}

def result(code=0, stdout=""):
    return subprocess.CompletedProcess([], code, stdout, "")

class ClassificationTests(unittest.TestCase):
    def classify(self, branch=None, prs=None):
        return pruner.classify(branch or {"name": "old", "commit": {"sha": SHA}}, prs or {}, MAIN, "test", {"old": ENTRY})

    def test_main_never_eligible(self):
        with patch.object(pruner, "api") as api:
            self.assertEqual(self.classify({"name": "main", "commit": {"sha": SHA}})[0], "preserve")
            api.assert_not_called()

    def test_protected_branch_never_eligible(self):
        self.assertEqual(self.classify({"name": "old", "commit": {"sha": SHA}, "protected": True})[0], "preserve")

    def test_open_head_or_base_blocks_even_reviewed_retirement(self):
        self.assertEqual(self.classify(prs={"old": [{"state": "open"}]})[0], "preserve")

    def test_comparison_failure_preserves(self):
        with patch.object(pruner, "api", side_effect=urllib.error.URLError("offline")):
            self.assertEqual(self.classify()[0], "preserve")

    def test_unknown_comparison_does_not_authorize(self):
        with patch.object(pruner, "api", return_value={}), patch.object(pruner, "reviewed_retirement_matches", return_value=False):
            self.assertEqual(self.classify()[0], "preserve")

    def test_reachable_commit_remains_eligible(self):
        with patch.object(pruner, "api", return_value={"ahead_by": 0}):
            self.assertEqual(self.classify()[0], "delete")

    def test_matching_merged_pr_is_eligible(self):
        self.assertEqual(self.classify(prs={"old": [{"state": "closed", "merged_at": "2026-10-08", "head": {"sha": SHA}}]})[0], "delete")

    def test_merged_pr_at_other_tip_does_not_authorize(self):
        with patch.object(pruner, "api", return_value={"ahead_by": 1}), patch.object(pruner, "reviewed_retirement_matches", return_value=False):
            self.assertEqual(self.classify(prs={"old": [{"state": "closed", "merged_at": "2026-10-08", "head": {"sha": MAIN}}]})[0], "preserve")

    def test_reviewed_content_requires_archiving(self):
        with patch.object(pruner, "api", return_value={"ahead_by": 1}), patch.object(pruner, "reviewed_retirement_matches", return_value=True):
            self.assertEqual(self.classify()[0], "archive-delete")

class EvidenceTests(unittest.TestCase):
    def test_moved_tip_rejected_without_subprocess(self):
        with patch.object(pruner.subprocess, "run") as run:
            self.assertFalse(pruner.reviewed_retirement_matches(ENTRY, MAIN, MAIN))
            run.assert_not_called()

    def test_rewritten_main_rejected(self):
        with patch.object(pruner.subprocess, "run", return_value=result(1)):
            self.assertFalse(pruner.reviewed_retirement_matches(ENTRY, SHA, MAIN))

    def test_changed_or_missing_content_rejected(self):
        for response in [result(0, "d" * 40), result(1)]:
            with self.subTest(response=response), patch.object(pruner.subprocess, "run", side_effect=[result(), response]):
                self.assertFalse(pruner.reviewed_retirement_matches(ENTRY, SHA, MAIN))

    def test_identical_reviewed_content_passes(self):
        with patch.object(pruner.subprocess, "run", side_effect=[result(), result(0, "c" * 40 + "\n")]):
            self.assertTrue(pruner.reviewed_retirement_matches(ENTRY, SHA, MAIN))

class ArchiveTests(unittest.TestCase):
    def test_existing_exact_tag_is_idempotent(self):
        ref = "refs/tags/" + ENTRY["archive_tag"]
        with patch.object(pruner.subprocess, "run", return_value=result(0, SHA + "\t" + ref + "\n")) as run:
            self.assertTrue(pruner.archive_exact_tip(ENTRY))
            self.assertEqual(run.call_count, 1)

    def test_existing_conflicting_tag_is_not_overwritten(self):
        ref = "refs/tags/" + ENTRY["archive_tag"]
        with patch.object(pruner.subprocess, "run", return_value=result(0, MAIN + "\t" + ref + "\n")) as run:
            self.assertFalse(pruner.archive_exact_tip(ENTRY))
            self.assertEqual(run.call_count, 1)

    def test_tag_creation_requires_absence_lease_and_remote_verification(self):
        ref = "refs/tags/" + ENTRY["archive_tag"]
        with patch.object(pruner.subprocess, "run", side_effect=[result(), result(), result(0, SHA + "\t" + ref + "\n")]) as run:
            self.assertTrue(pruner.archive_exact_tip(ENTRY))
            self.assertIn("--force-with-lease=" + ref + ":", run.call_args_list[1].args[0])

    def test_failed_or_unverified_tag_creation_blocks(self):
        for responses in [[result(), result(1)], [result(), result(), result()]]:
            with self.subTest(responses=responses), patch.object(pruner.subprocess, "run", side_effect=responses):
                self.assertFalse(pruner.archive_exact_tip(ENTRY))

    def test_network_failure_blocks_archive(self):
        with patch.object(pruner.subprocess, "run", return_value=result(1)):
            with self.assertRaises(RuntimeError):
                pruner.archive_exact_tip(ENTRY)

    def test_deletion_has_exact_branch_lease(self):
        with patch.object(pruner.subprocess, "run", return_value=result()) as run:
            pruner.delete_with_lease("old", SHA)
            self.assertIn("--force-with-lease=refs/heads/old:" + SHA, run.call_args.args[0])

class ApplyTests(unittest.TestCase):
    def test_failed_archive_never_calls_delete(self):
        branches = [{"name": "main", "commit": {"sha": MAIN}}, {"name": "old", "commit": {"sha": SHA}}]
        def verdict(branch, *args):
            return ("preserve", "main") if branch["name"] == "main" else ("archive-delete", "reviewed")
        with patch.dict(pruner.os.environ, {"GITHUB_TOKEN": "test", "GITHUB_REPOSITORY": pruner.REPO}), \
             patch.object(pruner, "all_pages", side_effect=[branches, []]), \
             patch.object(pruner, "load_retirements", return_value={"old": ENTRY}), \
             patch.object(pruner.subprocess, "run", return_value=result()), \
             patch.object(pruner, "classify", side_effect=verdict), \
             patch.object(pruner, "archive_exact_tip", return_value=False), \
             patch.object(pruner, "delete_with_lease") as delete:
            self.assertEqual(pruner.run(True), 1)
            delete.assert_not_called()

    def test_dry_run_never_archives_or_deletes(self):
        branches = [{"name": "main", "commit": {"sha": MAIN}}, {"name": "old", "commit": {"sha": SHA}}]
        def verdict(branch, *args):
            return ("preserve", "main") if branch["name"] == "main" else ("archive-delete", "reviewed")
        with patch.dict(pruner.os.environ, {"GITHUB_TOKEN": "test", "GITHUB_REPOSITORY": pruner.REPO}), \
             patch.object(pruner, "all_pages", side_effect=[branches, []]), \
             patch.object(pruner, "load_retirements", return_value={"old": ENTRY}), \
             patch.object(pruner.subprocess, "run", return_value=result()), \
             patch.object(pruner, "classify", side_effect=verdict), \
             patch.object(pruner, "archive_exact_tip") as archive, \
             patch.object(pruner, "delete_with_lease") as delete:
            self.assertEqual(pruner.run(False), 0)
            archive.assert_not_called()
            delete.assert_not_called()

    def test_invalid_manifest_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "reviewed_branch_retirements.json"
            path.write_text(json.dumps({"version": 1, "retirements": [{**ENTRY, "branch": "main"}]}))
            with patch.object(pruner, "__file__", str(Path(directory) / "pruner.py")):
                with self.assertRaises(RuntimeError):
                    pruner.load_retirements()

if __name__ == "__main__":
    unittest.main()
