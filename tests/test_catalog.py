"""Meaningful intake and publication regressions, using real licensed font binaries."""
import hashlib
import json
import shutil
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from catalog import ROOT, InvalidFont, archive, build, card, validate


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "fonts"
        self.root.mkdir()
        shutil.copytree(ROOT / "fonts/chilanka", self.root / "chilanka")
        self.meta = self.root / "chilanka/metadata.json"

    def tearDown(self):
        self.temp.cleanup()

    def change(self, **values):
        data = json.loads(self.meta.read_text())
        data.update(values)
        self.meta.write_text(json.dumps(data))

    def test_actual_new_submission_enters_catalog(self):
        self.assertEqual([f["slug"] for f in validate(self.root)], ["chilanka"])
        shutil.copytree(ROOT / "fonts/manjari", self.root / "manjari")
        self.assertEqual([f["slug"] for f in validate(self.root)], ["chilanka", "manjari"])

    def test_empty_catalog_is_valid(self):
        shutil.rmtree(self.root / "chilanka")
        self.assertEqual(validate(self.root), [])

    def test_path_traversal_rejected(self):
        self.change(preview="../../secret.ttf")
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_symlink_rejected_before_read(self):
        (self.root / "chilanka/extra.txt").symlink_to("/etc/passwd")
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_arbitrary_code_file_rejected(self):
        (self.root / "chilanka/execute.py").write_text("raise SystemExit('never run')")
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_javascript_source_url_rejected(self):
        self.change(source="javascript:alert(1)")
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_html_injection_rejected(self):
        self.change(name='<img src=x onerror="alert(1)">')
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_credentials_url_rejected(self):
        self.change(source="https://secret@example.com/path")
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_duplicated_font_binary_rejected(self):
        shutil.copytree(self.root / "chilanka", self.root / "copy")
        data=json.loads((self.root / "copy/metadata.json").read_text())
        data.update(slug="copy", name="Different", family="Different")
        (self.root / "copy/metadata.json").write_text(json.dumps(data))
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_hash_tampering_rejected(self):
        with (self.root / "chilanka/Chilanka-Regular.ttf").open("ab") as f: f.write(b"tampered")
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_malformed_font_rejected_even_with_correct_hash(self):
        payload = b"\x00\x01\x00\x00broken"
        (self.root / "chilanka/Chilanka-Regular.ttf").write_bytes(payload)
        data=json.loads(self.meta.read_text())
        data["files"][0]["sha256"]=hashlib.sha256(payload).hexdigest()
        self.meta.write_text(json.dumps(data))
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_missing_licence_rejected(self):
        (self.root / "chilanka/OFL.txt").unlink()
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_embedded_family_mismatch_rejected(self):
        self.change(family="Invented")
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_unpinned_source_rejected(self):
        data=json.loads(self.meta.read_text())
        data["files"][0]["sourceUrl"]=data["files"][0]["sourceUrl"].replace(data["revision"],"main")
        self.meta.write_text(json.dumps(data))
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_oversize_file_rejected(self):
        (self.root / "chilanka/huge.ttf").write_bytes(b"0"*(3*1024*1024+1))
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_duplicate_json_keys_rejected(self):
        self.meta.write_text('{"slug":"chilanka","slug":"other"}')
        with self.assertRaises(InvalidFont): validate(self.root)

    def test_download_keeps_license_notices_metadata_and_original_bytes(self):
        data=validate(self.root)[0]
        path=Path(self.temp.name)/"font.zip"
        archive(self.root / "chilanka", data, path)
        with zipfile.ZipFile(path) as z:
            self.assertEqual(len(z.namelist()),4)
            self.assertEqual(z.read("chilanka/OFL.txt"),(self.root/"chilanka/OFL.txt").read_bytes())
            self.assertEqual(z.read("chilanka/Chilanka-Regular.ttf"),(self.root/"chilanka/Chilanka-Regular.ttf").read_bytes())
        before=path.read_bytes()
        archive(self.root / "chilanka",data,path)
        self.assertEqual(path.read_bytes(),before)

    def test_card_has_usable_download_and_licence_without_javascript(self):
        rendered=card(validate(self.root)[0])
        self.assertIn('href="downloads/chilanka.zip" download',rendered)
        self.assertIn('href="fonts/chilanka/OFL.txt"',rendered)
        self.assertIn("Curated reference",rendered)


class BuildTests(unittest.TestCase):
    def test_new_submission_publishes_in_generated_page(self):
        with tempfile.TemporaryDirectory() as tmp:
            fonts=Path(tmp)/"fonts"
            fonts.mkdir()
            shutil.copytree(ROOT/"fonts/chilanka",fonts/"chilanka")
            build(fonts=fonts)
            self.assertEqual(len(json.loads((ROOT/"dist/catalog.json").read_text())),1)
            shutil.copytree(ROOT/"fonts/manjari",fonts/"manjari")
            p=fonts/"manjari/metadata.json"
            data=json.loads(p.read_text());data["origin"]="community"
            p.write_text(json.dumps(data))
            try:
                build(fonts=fonts)
                rendered=(ROOT/"dist/index.html").read_text()
                self.assertIn('id="manjari"',rendered)
                self.assertIn('data-origin="community"',rendered)
                self.assertNotIn('No community fonts have been published here yet.',rendered)
                self.assertTrue((ROOT/"dist/downloads/manjari.zip").is_file())
            finally:
                build()

    def test_empty_site_has_no_fabricated_font(self):
        with tempfile.TemporaryDirectory() as tmp:
            try:
                build(fonts=Path(tmp))
                rendered=(ROOT/"dist/index.html").read_text()
                self.assertIn("waiting for its first font",rendered)
                self.assertNotIn("Chilanka",rendered)
                self.assertNotIn("data-font=",rendered)
            finally:
                build()

    def test_complete_build_is_deterministic(self):
        def hashes():
            return {p.relative_to(ROOT/"dist").as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in (ROOT/"dist").rglob("*") if p.is_file()}
        build()
        first=hashes()
        build()
        self.assertEqual(first,hashes())
        self.assertNotIn("CNAME",first)
        self.assertNotIn("{{",(ROOT/"dist/index.html").read_text())


if __name__ == "__main__": unittest.main()
