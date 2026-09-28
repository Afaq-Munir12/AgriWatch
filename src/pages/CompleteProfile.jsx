import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import { ShieldCheck, UploadCloud, X, Loader2, Sprout, Users2, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { getDistricts } from "../services/droughtService";
import { createFarmerFields } from "../services/farmerFieldService";
import { addRipple } from "../utils/ripple";
import { useSupabaseAuth } from "../supabase/useSupabaseAuth";
import { supabase } from "../supabase/config";

const roleOptions = [
  { key: "farmer", label: "Farmer", icon: Sprout },
  { key: "public", label: "General Public", icon: Users2 },
  { key: "pdma", label: "PDMA Officer", icon: ShieldCheck },
];

const DOCS_BUCKET = "verification-documents";

export default function CompleteProfile() {
  const { t } = useLanguage();
  const { user, loading: authLoading, signOut } = useSupabaseAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState(() => localStorage.getItem("pendingSignupRole") === "admin" ? "pdma" : (localStorage.getItem("pendingSignupRole") || "farmer"));
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [tehsil, setTehsil] = useState("");
  const [districts, setDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [fields, setFields] = useState([{ fieldName: "Field 1", crop: "", areaAcres: "" }]);
  const [designation, setDesignation] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Not signed in with Google at all — send back to login.
  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    getDistricts()
      .then((result) => {
        if (cancelled) return;
        const list = Array.isArray(result) ? result : result?.districts || [];
        setDistricts(list.map((d, i) => ({ id: d.id ?? i, name: d.name || d.district })).filter((d) => d.name));
      })
      .catch((err) => setError(err.message || "Could not load districts."))
      .finally(() => !cancelled && setDistrictsLoading(false));
    return () => { cancelled = true; };
  }, []);

  function updateField(index, key, value) {
    setFields((prev) => prev.map((f, i) => i === index ? { ...f, [key]: value } : f));
  }

  function addField() {
    setFields((prev) => [...prev, { fieldName: `Field ${prev.length + 1}`, crop: "", areaAcres: "" }]);
  }

  function removeField(index) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function addFiles(e) {
    const chosen = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...chosen]);
    e.target.value = "";
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !phone.trim() || !district) {
      setError("Please fill in your name, phone, and district.");
      return;
    }
    if (role === "farmer") {
      const invalidField = fields.some((f) => !f.fieldName.trim() || !f.crop.trim() || !f.areaAcres || Number(f.areaAcres) <= 0);
      if (invalidField) {
        setError("Please complete the field name, crop, and acreage for every field.");
        return;
      }
    }
    if (files.length === 0) {
      setError("Please attach at least one document for verification (CNIC, farm proof, or PDMA ID card).");
      return;
    }

    setBusy(true);
    try {
      // 1. Upload each document to private storage, under a folder named
      //    after this user's id (matches the storage RLS policy).
      const uploaded = [];
      for (const file of files) {
        const path = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from(DOCS_BUCKET).upload(path, file);
        if (uploadErr) throw uploadErr;
        uploaded.push({ name: file.name, path });
      }

      // 2. Write the request row itself.
      const { error: insertErr } = await supabase.from("website_signup_requests").insert({
        user_id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        role,
        phone: phone.trim(),
        district,
        tehsil: role === "farmer" ? tehsil.trim() : null,
        // Keep these two legacy columns populated for existing screens.
        // farmer_fields is the source of truth for multiple fields.
        crop: role === "farmer" ? fields[0]?.crop || null : null,
        farm_size: role === "farmer" ? `${fields.reduce((sum, f) => sum + Number(f.areaAcres || 0), 0)} acres` : null,
        designation: role === "pdma" ? designation.trim() : null,
        documents: uploaded,
        status: "pending",
      });
      if (insertErr) throw insertErr;

      // 3. Store every farmer field/crop separately.
      if (role === "farmer") {
        await createFarmerFields(user.id, fields);
      }

      localStorage.removeItem("pendingSignupRole");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Failed to submit verification request:", err);
      setError(err.message || "Something went wrong submitting your request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Link to="/" className="flex flex-col items-center">
            <img src={logo} alt="AgriWatch Pakistan" className="w-16 h-16 rounded-full bg-white object-cover mb-3" />
            <h1 className="font-display text-white text-lg font-semibold">AgriWatch Pakistan</h1>
          </Link>
          <p className="text-primary-light text-xs tracking-widest uppercase mt-1">Complete your profile</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-paper rounded-xl p-6 shadow-xl space-y-4">
          <p className="text-sm text-ink/60">
            Signed in as <span className="font-medium text-ink">{user?.email}</span>. Submit your details and a document
            so an admin can verify and approve your account.
            {" "}
            <button
              type="button"
              onClick={() => signOut().then(() => navigate("/login", { replace: true }))}
              className="text-primary hover:underline font-medium"
            >
              Not you? Sign out
            </button>
          </p>

          <Field label="I am a">
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRole(key)}
                  onMouseDown={addRipple}
                  className={`btn-animated flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-colors ${
                    role === key ? "bg-primary text-white border-primary" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Full name">
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="form-input" />
          </Field>

          <Field label="Phone number">
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" dir="ltr" className="form-input" />
          </Field>

          <Field label="District">
            <select required value={district} onChange={(e) => setDistrict(e.target.value)} className="form-select">
              <option value="">Select district</option>
              {districtsLoading ? <option disabled>Loading districts...</option> : districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </Field>

          {role === "farmer" && (
            <>
              <Field label="Tehsil">
                <input value={tehsil} onChange={(e) => setTehsil(e.target.value)} placeholder="Tehsil" className="form-input" />
              </Field>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-ink/50 uppercase tracking-wide">Your fields</p>
                    <p className="text-xs text-ink/40 mt-0.5">Add every field you currently manage.</p>
                  </div>
                  <button type="button" onClick={addField} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Plus size={13} /> Add field
                  </button>
                </div>

                {fields.map((field, index) => (
                  <div key={index} className="border border-line rounded-lg p-3 bg-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Field {index + 1}</p>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => removeField(index)} className="text-danger flex items-center gap-1 text-xs">
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>
                    <input required value={field.fieldName} onChange={(e) => updateField(index, "fieldName", e.target.value)} placeholder="Field name" className="form-input" />
                    <input required value={field.crop} onChange={(e) => updateField(index, "crop", e.target.value)} placeholder="Crop, e.g. Cotton" className="form-input" />
                    <div className="flex items-center gap-2">
                      <input required min="0.01" step="0.01" type="number" value={field.areaAcres} onChange={(e) => updateField(index, "areaAcres", e.target.value)} placeholder="Area" className="form-input" />
                      <span className="text-xs text-ink/50 shrink-0">acres</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {role === "pdma" && (
            <Field label="Designation">
              <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Field Officer" className="form-input" />
            </Field>
          )}

          <Field label={role === "pdma" ? "PDMA ID card / appointment letter" : role === "farmer" ? "CNIC / proof of land ownership" : "CNIC or other ID"}>
            <label className="flex items-center gap-2 border border-dashed border-line rounded-lg px-3 py-3 text-sm text-ink/50 cursor-pointer hover:bg-paper-dim">
              <UploadCloud size={16} />
              Choose file(s)
              <input type="file" multiple accept="image/*,.pdf" onChange={addFiles} className="hidden" />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-surface border border-line rounded-lg px-3 py-1.5">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-ink/40 hover:text-danger shrink-0 ml-2">
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>

          {error && <p className="text-xs text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            onMouseDown={addRipple}
            className="btn-animated btn-pulse w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Submit for verification
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink/50 uppercase tracking-wide flex items-center gap-1">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}