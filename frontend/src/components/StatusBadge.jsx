const styles = {
  uploaded: 'bg-slate-100 text-slate-600 ring-slate-200',
  processing: 'bg-amber-50 text-amber-700 ring-amber-200',
  processed: 'bg-sky-50 text-sky-700 ring-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
        styles[status] || styles.uploaded
      }`}
    >
      {status}
    </span>
  )
}
