"use client";

import React, { useEffect, useMemo, useState } from "react";

const treatmentTypes = [
  "FISIOTERAPI",
  "URUTAN TERAPI",
  "TRIGGER POINT",
  "PNF STRETCHING",
  "REHABILITASI",
  "DRY NEEDLING",
  "SHOCKWAVE",
  "BEKAM",
];

const timeSlots = [
  "10:30 AM",
  "11:30 AM",
  "12:30 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
];

const STORAGE_KEY = "drehab_locum_records_v1";
const SERIAL_KEY = "drehab_locum_next_serial_v1";

function calculateCommission(payment, rate) {
  const safePayment = Number(payment || 0);
  const safeRate = Number(rate || 0);

  if (!Number.isFinite(safePayment) || !Number.isFinite(safeRate)) return 0;
  return (safePayment * safeRate) / 100;
}

function calculateTotals(records) {
  return records.reduce(
    (acc, item) => {
      acc.totalPayment += Number(item.payment || 0);
      acc.totalCommission += Number(item.commission || 0);
      acc.totalSessions += 1;
      return acc;
    },
    { totalPayment: 0, totalCommission: 0, totalSessions: 0 }
  );
}

function formatRM(value) {
  const safeValue = Number(value || 0);
  return `RM${safeValue.toFixed(2)}`;
}

function formatReceiptNo(serialNo) {
  const safeSerial = Number(serialNo || 0);
  return `LOC-${String(safeSerial).padStart(5, "0")}`;
}

function getInitialRecords() {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to load locum records", error);
    return [];
  }
}

function getInitialNextSerial() {
  if (typeof window === "undefined") return 1;

  try {
    const saved = window.localStorage.getItem(SERIAL_KEY);
    return saved ? Number(saved) || 1 : 1;
  } catch (error) {
    console.error("Failed to load next serial", error);
    return 1;
  }
}

function buildWhatsAppText(record) {
  return [
    "*RESIT STAF*",
    "PUSAT KESIHATAN DREHAB AF",
    "",
    `NO. RESIT: ${formatReceiptNo(record.serialNo)}`,
    `NAMA STAF: ${record.staffName}`,
    `NAMA PESAKIT: ${record.patientName || "-"}`,
    `TARIKH RAWATAN: ${record.treatmentDate}`,
    `WAKTU RAWATAN: ${record.treatmentTime}`,
    `JENIS RAWATAN: ${record.treatmentType}`,
    "",
    `BAYARAN RAWATAN: ${formatRM(record.payment)}`,
    `KADAR KOMISEN: ${record.commissionRate}%`,
    `JUMLAH BAYARAN STAF: ${formatRM(record.commission)}`,
    "",
    "DOKUMEN INI DIJANA SEBAGAI REKOD BAYARAN STAF.",
  ].join("\n");
}

function buildWhatsAppMessage(record) {
  return `https://wa.me/?text=${encodeURIComponent(buildWhatsAppText(record))}`;
}

function exportRecordsToCsv(records) {
  const headers = [
    "NO RESIT",
    "NAMA STAF",
    "NAMA PESAKIT",
    "TARIKH RAWATAN",
    "WAKTU RAWATAN",
    "JENIS RAWATAN",
    "BAYARAN RAWATAN",
    "KADAR KOMISEN",
    "JUMLAH BAYARAN STAF",
    "NOTA",
  ];

  const rows = records.map((item) => [
    formatReceiptNo(item.serialNo),
    item.staffName,
    item.patientName || "-",
    item.treatmentDate,
    item.treatmentTime,
    item.treatmentType,
    formatRM(item.payment),
    `${item.commissionRate}%`,
    formatRM(item.commission),
    item.note || "-",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "rekod-staf-locum.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function runTests() {
  console.assert(calculateCommission(100, 30) === 30, "Test failed: 30% of RM100 should be RM30");
  console.assert(calculateCommission(129, 30) === 38.7, "Test failed: 30% of RM129 should be RM38.70");
  console.assert(calculateCommission("200", "30") === 60, "Test failed: string numbers should calculate correctly");
  console.assert(formatReceiptNo(1) === "LOC-00001", "Test failed: receipt no should start at LOC-00001");
  console.assert(formatReceiptNo(23) === "LOC-00023", "Test failed: receipt no should pad to 5 digits");
  console.assert(formatReceiptNo(99999) === "LOC-99999", "Test failed: receipt no should support 5 digit serials");
  console.assert(formatRM(38.7) === "RM38.70", "Test failed: RM format should show two decimals");

  const sampleTotals = calculateTotals([
    { payment: 100, commission: 30 },
    { payment: 200, commission: 60 },
  ]);

  console.assert(sampleTotals.totalSessions === 2, "Test failed: total sessions should be 2");
  console.assert(sampleTotals.totalPayment === 300, "Test failed: total payment should be RM300");
  console.assert(sampleTotals.totalCommission === 90, "Test failed: total commission should be RM90");

  const sampleRecord = {
    id: 1712345678901,
    serialNo: 1,
    staffName: "ALI IMRAN",
    patientName: "AHMAD",
    treatmentDate: "2026-05-06",
    treatmentTime: "10:30 AM",
    treatmentType: "FISIOTERAPI",
    payment: 129,
    commissionRate: 30,
    commission: 38.7,
    note: "TEST",
  };

  console.assert(buildWhatsAppText(sampleRecord).includes("\n"), "Test failed: WhatsApp text should contain escaped line breaks");
  console.assert(buildWhatsAppMessage(sampleRecord).startsWith("https://wa.me/?text="), "Test failed: WhatsApp URL should be valid");
  console.assert(buildWhatsAppText(sampleRecord).includes("JUMLAH BAYARAN STAF: RM38.70"), "Test failed: WhatsApp text should include staff commission");
}

if (typeof window !== "undefined") {
  runTests();
}

function Icon({ children }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center text-base leading-none" aria-hidden="true">
      {children}
    </span>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-3 text-center shadow-lg">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200">
        <Icon>{icon}</Icon>
      </div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="font-bold text-white">{value}</p>
    </div>
  );
}

function FieldBox({ label, children, className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-800 shadow-[0_0_20px_rgba(34,211,238,0.08)] ${className}`}>
      <div className="absolute left-4 top-2 z-10 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
        {label}
      </div>
      {children}
    </div>
  );
}

const inputClass = "w-full bg-transparent px-4 pb-3 pt-7 uppercase text-white outline-none placeholder-transparent";
const selectClass = "w-full bg-transparent px-4 pb-3 pt-7 uppercase text-white outline-none";

function ReceiptModal({ record, onClose }) {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm">
      <div className="max-h-[96vh] w-full max-w-[340px] overflow-y-auto rounded-3xl bg-white text-slate-950 shadow-2xl print:max-h-none print:max-w-md print:overflow-visible print:shadow-none">
        <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-4 text-white print:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/75">RESIT BAYARAN STAF</p>
              <h2 className="mt-1 text-base font-bold">PUSAT KESIHATAN DREHAB AF</h2>
              <p className="text-xs text-white/85">KOMISEN STAF LOCUM</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white print:hidden"
              aria-label="TUTUP RESIT"
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between rounded-2xl bg-slate-100 p-2.5">
            <div>
              <p className="text-xs text-slate-500">NO. RESIT</p>
              <p className="font-bold">{formatReceiptNo(record.serialNo)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">STATUS</p>
              <p className="font-bold text-emerald-600">SELESAI</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-slate-200 p-2.5">
              <p className="text-xs text-slate-500">NAMA STAF</p>
              <p className="font-semibold">{record.staffName}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-2.5">
              <p className="text-xs text-slate-500">NAMA PESAKIT</p>
              <p className="font-semibold">{record.patientName || "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-2.5">
              <p className="text-xs text-slate-500">TARIKH RAWATAN</p>
              <p className="font-semibold">{record.treatmentDate}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-2.5">
              <p className="text-xs text-slate-500">WAKTU RAWATAN</p>
              <p className="font-semibold">{record.treatmentTime}</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-slate-200 p-2.5">
              <p className="text-xs text-slate-500">JENIS RAWATAN</p>
              <p className="font-semibold">{record.treatmentType}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-3">
            <div className="flex justify-between border-b border-cyan-100 pb-2 text-sm">
              <span className="text-slate-600">BAYARAN RAWATAN</span>
              <span className="font-bold">{formatRM(record.payment)}</span>
            </div>
            <div className="flex justify-between border-b border-cyan-100 py-2 text-sm">
              <span className="text-slate-600">KADAR KOMISEN</span>
              <span className="font-bold">{record.commissionRate}%</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="font-bold text-slate-700">JUMLAH BAYARAN STAF</span>
              <span className="text-xl font-black text-cyan-700">{formatRM(record.commission)}</span>
            </div>
          </div>

          {record.note && (
            <div className="rounded-2xl bg-slate-100 p-2.5 text-xs text-slate-700">
              <p className="text-xs font-semibold text-slate-500">NOTA</p>
              <p>{record.note}</p>
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-slate-300 p-2.5 text-center text-[10px] text-slate-500">
            DOKUMEN INI DIJANA SEBAGAI REKOD BAYARAN KOMISEN STAF BERDASARKAN RAWATAN YANG TELAH DIREKODKAN.
          </div>

          <div className="grid grid-cols-2 gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="rounded-2xl bg-slate-950 px-3 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              SAVE AS PDF
            </button>

            <a
              href={buildWhatsAppMessage(record)}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-emerald-500 px-3 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-400"
            >
              WHATSAPP
            </a>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100 print:hidden"
          >
            TUTUP RESIT
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LocumCommissionApp() {
  const [records, setRecords] = useState(getInitialRecords);
  const [nextSerial, setNextSerial] = useState(getInitialNextSerial);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState({
    staffName: "",
    patientName: "",
    treatmentDate: "",
    treatmentTime: "",
    treatmentType: "",
    payment: "",
    commissionRate: "30",
    note: "",
  });

  const commission = useMemo(() => {
    return calculateCommission(form.payment, form.commissionRate);
  }, [form.payment, form.commissionRate]);

  const totals = useMemo(() => calculateTotals(records), [records]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error("Failed to save locum records", error);
    }
  }, [records]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SERIAL_KEY, String(nextSerial));
    } catch (error) {
      console.error("Failed to save next serial", error);
    }
  }, [nextSerial]);

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function saveRecord() {
    const requiredFields = [
      form.staffName,
      form.patientName,
      form.treatmentDate,
      form.treatmentTime,
      form.treatmentType,
      form.payment,
      form.commissionRate,
      form.note,
    ];

    if (requiredFields.some((field) => String(field || "").trim() === "")) {
      alert("SEMUA FIELD WAJIB DIISI.");
      return;
    }

    const serialNo = nextSerial;

    const newRecord = {
      id: Date.now(),
      serialNo,
      staffName: form.staffName.trim().toUpperCase(),
      patientName: form.patientName.trim().toUpperCase(),
      treatmentDate: form.treatmentDate,
      treatmentTime: form.treatmentTime,
      treatmentType: form.treatmentType,
      payment: Number(form.payment),
      commissionRate: Number(form.commissionRate),
      commission,
      note: form.note.trim().toUpperCase(),
    };

    setRecords((prev) => [newRecord, ...prev]);
    setNextSerial((prev) => prev + 1);
    setSelectedRecord(newRecord);
    setForm({
      staffName: form.staffName.trim().toUpperCase(),
      patientName: "",
      treatmentDate: "",
      treatmentTime: "",
      treatmentType: "",
      payment: "",
      commissionRate: "30",
      note: "",
    });
  }

  function deleteRecord(event, id) {
    event.stopPropagation();
    setRecords((prev) => prev.filter((item) => item.id !== id));
    setSelectedRecord((prev) => (prev?.id === id ? null : prev));
  }

  function resetAllData() {
    const confirmReset = window.confirm("RESET SEMUA REKOD DAN NO SIRI?");

    if (!confirmReset) return;

    setRecords([]);
    setNextSerial(1);
    setSelectedRecord(null);

    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SERIAL_KEY);
    } catch (error) {
      console.error("Failed to reset local storage", error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white print:bg-white print:p-0">
      <ReceiptModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />

      <div className="mx-auto w-full max-w-md space-y-4 print:hidden">
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">👤</div>
            <div>
              <h1 className="text-xl font-bold leading-tight">KOMISEN & ELAUN STAF</h1>
              <p className="text-sm text-white/85">REKOD BAYARAN STAF</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard icon="📋" label="SESI" value={totals.totalSessions} />
          <StatCard icon="💰" label="BAYARAN" value={`RM${totals.totalPayment.toFixed(0)}`} />
          <StatCard icon="%" label="KOMISEN" value={`RM${totals.totalCommission.toFixed(0)}`} />
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-4 shadow-xl">
          <div className="space-y-3">
            <h2 className="text-lg font-bold">TAMBAH REKOD</h2>

            <FieldBox label="NAMA STAF">
              <input
                className={inputClass}
                value={form.staffName}
                onChange={(e) => updateForm("staffName", e.target.value.toUpperCase())}
              />
            </FieldBox>

            <FieldBox label="NAMA PESAKIT">
              <input
                className={inputClass}
                value={form.patientName}
                onChange={(e) => updateForm("patientName", e.target.value.toUpperCase())}
              />
            </FieldBox>

            <div className="grid grid-cols-2 gap-3">
              <FieldBox label="TARIKH">
                <input
                  type="date"
                  className={inputClass}
                  value={form.treatmentDate}
                  onChange={(e) => updateForm("treatmentDate", e.target.value)}
                />
              </FieldBox>

              <FieldBox label="WAKTU">
                <select
                  className={selectClass}
                  value={form.treatmentTime}
                  onChange={(e) => updateForm("treatmentTime", e.target.value)}
                >
                  <option value=""></option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </FieldBox>
            </div>

            <FieldBox label="JENIS RAWATAN">
              <select
                className={selectClass}
                value={form.treatmentType}
                onChange={(e) => updateForm("treatmentType", e.target.value)}
              >
                <option value=""></option>
                {treatmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FieldBox>

            <div className="grid grid-cols-2 gap-3">
              <FieldBox label="BAYARAN">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.payment}
                  onChange={(e) => updateForm("payment", e.target.value)}
                />
              </FieldBox>

              <FieldBox label="KOMISEN">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.commissionRate}
                  onChange={(e) => updateForm("commissionRate", e.target.value)}
                />
              </FieldBox>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <div>
                <p className="text-xs text-cyan-200">KOMISEN (RM)</p>
                <p className="text-2xl font-bold text-white">{formatRM(commission)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-xl text-cyan-200">✅</div>
            </div>

            <FieldBox label="NOTA">
              <textarea
                className="min-h-[80px] w-full bg-transparent px-4 pb-3 pt-7 uppercase text-white outline-none"
                value={form.note}
                onChange={(e) => updateForm("note", e.target.value.toUpperCase())}
              />
            </FieldBox>

            <button
              onClick={saveRecord}
              className="flex w-full items-center justify-center rounded-2xl bg-cyan-500 px-4 py-4 font-bold text-slate-950 transition hover:bg-cyan-400"
            >
              <span className="mr-2 text-lg">＋</span> SIMPAN REKOD
            </button>
          </div>
        </div>

        <div className="space-y-3 pb-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">SENARAI REKOD</h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetAllData}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-lg text-red-300 transition hover:bg-red-500/20"
                aria-label="RESET DATA"
              >
                ♻️
              </button>

              <button
                type="button"
                onClick={() => exportRecordsToCsv(records)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-lg text-emerald-300 transition hover:bg-emerald-500/20"
                aria-label="EXPORT CSV"
              >
                📄
              </button>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/50 p-6 text-center text-slate-400">
              BELUM ADA REKOD RAWATAN.
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((item) => (
                <details
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-slate-800">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-bold text-white">
                          {formatReceiptNo(item.serialNo)}
                        </p>
                        <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                          {item.treatmentTime}
                        </span>
                      </div>

                      <p className="truncate text-xs text-slate-300">
                        {item.staffName}
                      </p>

                      <p className="truncate text-[10px] text-slate-500">
                        {item.treatmentDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-cyan-300">KOMISEN</p>
                      <p className="text-sm font-bold text-white">
                        {formatRM(item.commission)}
                      </p>
                    </div>
                  </summary>

                  <div className="border-t border-white/5 bg-slate-950/40 p-3">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-xl bg-slate-800 p-2">
                          <p className="text-[10px] text-slate-500">PESAKIT</p>
                          <p className="font-medium text-white">
                            {item.patientName || "-"}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-800 p-2">
                          <p className="text-[10px] text-slate-500">RAWATAN</p>
                          <p className="font-medium text-white">
                            {item.treatmentType}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-cyan-400/10 bg-cyan-500/5 p-2">
                        <div>
                          <p className="text-[10px] text-cyan-200">BAYARAN</p>
                          <p className="text-xs font-bold text-white">
                            {formatRM(item.payment)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-cyan-200">
                            {item.commissionRate}%
                          </p>
                          <p className="text-xs font-bold text-white">
                            {formatRM(item.commission)}
                          </p>
                        </div>
                      </div>

                      {item.note && (
                        <div className="rounded-xl bg-slate-800 p-2 text-[10px] text-slate-300">
                          {item.note}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(item)}
                          className="rounded-xl bg-cyan-500 px-3 py-2 text-[11px] font-bold text-slate-950 transition hover:bg-cyan-400"
                        >
                          BUKA RESIT
                        </button>

                        <button
                          type="button"
                          onClick={(event) => deleteRecord(event, item.id)}
                          className="rounded-xl bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-300 transition hover:bg-red-500/20"
                        >
                          PADAM
                        </button>
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
