import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import client from "../api/client";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowLeft,
  ExternalLink,
  Lock,
  FileCheck,
} from "lucide-react";

export default function VerifyCertificatePage() {
  const { id: routeId } = useParams();
  const [certId, setCertId] = useState(routeId || "SL-2026-CERT-DEMO0001");
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (routeId) {
      verifyCode(routeId);
    } else {
      verifyCode("SL-2026-CERT-DEMO0001");
    }
  }, [routeId]);

  async function verifyCode(code) {
    if (!code || !code.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await client.get(`/verify/certificate/${encodeURIComponent(code.trim())}`);
      setCertificate(res.data);
    } catch (err) {
      setCertificate(null);
      setError(
        err.response?.data?.detail ||
          `Certificate code "${code}" could not be verified against the sovereign passbook ledger.`
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (certId) verifyCode(certId);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto space-y-8 pb-16"
    >
      {/* Back to passbook */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Competency Passbook</span>
        </Link>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#A068FF]/15 text-[#C084FC] border border-[#A068FF]/30 font-bold">
          Public Verification Node
        </span>
      </div>

      {/* Header */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#A068FF]/20 border border-[#A068FF]/40 text-[#A068FF] mb-2 shadow-[0_0_20px_rgba(160,104,255,0.3)]">
          <FileCheck className="w-7 h-7" />
        </div>
        <h1 className="font-urbanist font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
          SkillLens Competency Credential Verification
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          Cryptographically verify empirical competency achievements and assessment evidence issued by the SkillLens automated engine.
        </p>
      </div>

      {/* Verification Code Search Bar */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto">
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="e.g. SL-2026-CERT-DEMO0001"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/15 rounded-xl pl-11 pr-4 py-3 text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#A068FF] focus:ring-1 focus:ring-[#A068FF] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary text-xs sm:text-sm py-3 px-5 shrink-0 font-bold shadow-[0_0_15px_rgba(160,104,255,0.3)]"
          >
            {loading ? "Verifying…" : "Verify ID"}
          </button>
        </div>
      </form>

      {/* Verification Result Card */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#A068FF]/20 border-t-[#A068FF] animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Querying immutable credential ledger…</p>
        </div>
      )}

      {!loading && error && (
        <div className="p-8 rounded-2xl sovereign-card max-w-xl mx-auto text-center space-y-3 border-rose-500/30 shadow-2xl">
          <XCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h3 className="text-base sm:text-lg font-urbanist font-bold text-white">Record Not Found</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{error}</p>
          <p className="text-xs text-slate-500 font-mono">
            Check the certificate ID for typos or verify against your issued passbook PDF.
          </p>
        </div>
      )}

      {!loading && certificate && (
        <div className="sovereign-card rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto border border-[#A068FF]/30 shadow-2xl relative overflow-hidden space-y-6">
          {/* Subtle watermark badge */}
          <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-[#A068FF]/10 pointer-events-none blur-3xl" />

          {/* Verification Badge Banner */}
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#A068FF]/15 border border-[#A068FF]/30 flex items-center justify-center text-[#A068FF] shrink-0 shadow-[0_0_15px_rgba(160,104,255,0.25)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#C084FC] font-bold">
                  Status: {certificate.status}
                </span>
                <p className="text-xs text-slate-400">Cryptographically Authenticated</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-mono text-slate-400">Verification ID</p>
              <p className="text-xs sm:text-sm font-mono font-bold text-white">{certificate.verification_id}</p>
            </div>
          </div>

          {/* Certificate Body */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">This Certifies That</p>
              <h2 className="text-2xl sm:text-3xl font-urbanist font-extrabold text-white mt-1">
                {certificate.learner_name}
              </h2>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.025] border border-white/10 space-y-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Competency Verified</p>
              <p className="text-lg font-urbanist font-bold text-[#C084FC]">
                {certificate.competency_title}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {certificate.achievement_name}
              </p>
            </div>

            {/* Evidence Summary Table */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Empirical Evidence Ledger
              </p>
              <div className="rounded-xl bg-white/[0.02] border border-white/10 p-5 text-xs sm:text-sm space-y-2.5 font-mono">
                {Object.entries(certificate.evidence_summary || {}).map(([key, val]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 capitalize">{key.replace(/_/g, " ")}:</span>
                    <span className="text-slate-200 font-medium sm:text-right">{String(val)}</span>
                  </div>
                ))}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-white/10">
                  <span className="text-slate-400">Issue Date:</span>
                  <span className="text-[#C084FC] font-bold">
                    {certificate.issue_date ? new Date(certificate.issue_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "Verified"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Honesty Notice */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-slate-400 leading-relaxed">
            <p className="font-semibold text-slate-300 mb-1">Authenticity & Institutional Provenance:</p>
            This credential constitutes an automated <span className="text-[#C084FC] font-semibold">SkillLens Achievement Certificate</span> backed by empirical assessment evidence calibrated against the Mission Karmayogi FRAC competency framework. It is an internal capacity-building credential and does not purport to be an official government gazette appointment or UPSC/SSC certification.
          </div>
        </div>
      )}
    </motion.div>
  );
}
