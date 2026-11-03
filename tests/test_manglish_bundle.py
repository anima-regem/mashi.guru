"""Vendored typing data must retain its pin and complete licence notices."""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import catalog


class ManglishBundleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        shutil.copytree(catalog.ROOT / "vendor", self.root / "vendor")
        shutil.copytree(catalog.ROOT / "web", self.root / "web")
        self.out = self.root / "out"
        self.out.mkdir()
        self.pin = patch.object(catalog, "ROOT", self.root)
        self.pin.start()

    def tearDown(self):
        self.pin.stop()
        self.temp.cleanup()

    def test_bundle_keeps_both_complete_notices_and_local_rules(self):
        catalog.browser_bundle(self.out)
        bundle = (self.out / "app.js").read_text()
        vendor = self.root / "vendor/swanalekha"
        for name in ("LICENSE", "JS-LICENSE"):
            notice = (vendor / name).read_text()
            self.assertIn(notice, bundle)
            self.assertEqual((vendor / name).read_bytes(), (self.out / "notices/swanalekha" / (name + ".txt")).read_bytes())
        self.assertIn('globalThis.MashiManglishRules=Object.freeze(', bundle)
        self.assertIn('7463b55a0def8be146e58541840f1e9ad25b0b12', bundle)
        second = self.root / "second"
        second.mkdir()
        catalog.browser_bundle(second)
        self.assertEqual((self.out / "app.js").read_bytes(), (second / "app.js").read_bytes())

    def test_tampered_rules_are_rejected(self):
        with (self.root / "vendor/swanalekha/rules.json").open("a") as file:
            file.write(" ")
        with self.assertRaisesRegex(catalog.InvalidFont, "Pinned Swanalekha asset changed"):
            catalog.browser_bundle(self.out)

    def test_missing_notice_pin_is_rejected(self):
        path = self.root / "vendor/swanalekha/provenance.json"
        manifest = json.loads(path.read_text())
        del manifest["files"]["JS-LICENSE"]
        path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(catalog.InvalidFont, "Incomplete Swanalekha provenance"):
            catalog.browser_bundle(self.out)

    def test_symlinked_rule_data_is_rejected(self):
        path = self.root / "vendor/swanalekha/rules.json"
        data = path.read_bytes()
        path.unlink()
        target = self.root / "rules-copy.json"
        target.write_bytes(data)
        path.symlink_to(target)
        with self.assertRaisesRegex(catalog.InvalidFont, "Unexpected Swanalekha vendor file"):
            catalog.browser_bundle(self.out)
