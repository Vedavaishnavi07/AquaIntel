import unittest
from ml.data.build_dataset import validate
from ml.features.growth import features


class ContractTests(unittest.TestCase):
    def row(self, **changes):
        return dict(
            record_type="sample",
            data_origin="SYNTHETIC",
            record_id="s1",
            farm_id="f1",
            pond_id="p1",
            culture_cycle_id="c1",
            date="2026-01-11",
            stocking_date="2026-01-01",
            doc="10",
            species="Litopenaeus vannamei",
            basis="MEASURED",
            count="100",
            weightG="1500",
            **changes
        )

    def test_measured_sample(self):
        row = validate([self.row()])[0]
        self.assertEqual(row["abw_g"], 15)
        self.assertIsNone(row["image_references"])

    def test_duplicate_event_rejected(self):
        with self.assertRaises(ValueError):
            validate([self.row(), self.row()])

    def test_assumed_label_rejected(self):
        row = self.row()
        row["basis"] = "USER_ASSUMED"
        with self.assertRaises(ValueError):
            validate([row])

    def test_negative_weight(self):
        row = self.row()
        row["weightG"] = "-5"
        with self.assertRaises(ValueError):
            validate([row])

    def test_doc_mismatch(self):
        row = self.row()
        row["doc"] = "11"
        with self.assertRaises(ValueError):
            validate([row])

    def test_future_target_does_not_enter_features(self):
        samples = [
            dict(farm_id="f", cycle_id="c", event_id=str(i), doc=i * 7, abw_g=w)
            for i, w in enumerate([10, 12, 15])
        ]
        r = features(samples)[0]
        self.assertEqual(r["x"][0], 12)
        self.assertEqual(r["y"], 15)
        samples[-1]["abw_g"] = 99
        self.assertEqual(features(samples)[0]["x"], r["x"])


if __name__ == "__main__":
    unittest.main()
