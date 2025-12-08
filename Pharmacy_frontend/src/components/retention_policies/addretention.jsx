import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./addretention.module.css";
import { useAlert } from "../ui/alert-provider";

const AddRetention = () => {
  const cx = (...classes) => classes.filter(Boolean).join(" ");
  const navigate = useNavigate();
  const { id } = useParams(); // numeric id in edit mode
  const [isEdit, setIsEdit] = useState(false);
  const { showAlert } = useAlert();
  const [form, setForm] = useState({
    module: "",
    keep_years: 1,
    hold_from_purge: false,
  });

  useEffect(() => {
    if (id) {
      setIsEdit(true);
      fetch(`http://127.0.0.1:8000/api/retention-policies/${id}/`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to load");
          return res.json();
        })
        .then(data => {
          setForm({
            module: data.module || "",
            keep_years: data.keep_years ?? 1,
            hold_from_purge: !!data.hold_from_purge,
          });
        })
        .catch(err => console.error("Error loading policy:", err));
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setForm(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEdit
        ? `http://127.0.0.1:8000/api/retention-policies/${id}/`
        : `http://127.0.0.1:8000/api/retention-policies/`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        showAlert(isEdit ? "Policy updated!" : "Policy added!", "Success");
        navigate("/masters/retention-policies");
      } else {
        const txt = await res.text();
        console.error("Save failed:", txt);
        showAlert("Save failed", "Error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Save failed", "Error");
    }
  };

  return (
    <div className={styles["customers-container"]}>
      <h1 className={styles["customers-title"]}>{isEdit ? "Edit Retention Policy" : "Add Retention Policy"}</h1>

      <form className={styles["customers-form"]} onSubmit={handleSubmit}>
        <div className={styles["form-row"]}>
          <div className={styles["form-group"]}>
            <label>Module</label>
            <input
              type="text"
              name="module"
              value={form.module}
              onChange={handleChange}
              placeholder="e.g. INVENTORY"
              required
              readOnly={isEdit} /* keep module editable only on create; if you want to allow change remove this */
            />
          </div>

          <div className={styles["form-group"]}>
            <label>Keep Years</label>
            <input
              type="number"
              name="keep_years"
              value={form.keep_years}
              onChange={handleChange}
              min={0}
              required
            />
          </div>
        </div>

        <div className={styles["form-row"]}>
          <div className={cx(styles["form-group"], styles["checkbox-group"])} style={{ alignItems: "flex-start", marginTop: 20 }}>
            <label>
              <input
                type="checkbox"
                name="hold_from_purge"
                checked={form.hold_from_purge}
                onChange={handleChange}
              />
              &nbsp; Hold From Purge
            </label>
          </div>
        </div>

        <div className={styles["form-actions"]}>
          <button type="button" className={styles["cancel-btn"]} onClick={() => navigate("/masters/retention-policies")}>
            Cancel
          </button>

          <button type="submit" className={styles["submit-btn"]}>
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddRetention;
