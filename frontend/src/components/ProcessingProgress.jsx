const STAGE_LABELS = {
  queued: 'Queued',
  ocr: 'OCR Processing',
  classification: 'AI Classification',
  extraction: 'Field Extraction',
  validation: 'Validation',
  completed: 'Completed',
  failed: 'Failed',
}

export default function ProcessingProgress({ stage, progress, status }) {
  if (!stage && status === 'uploaded') {
    return <span className="text-xs text-slate-500">Waiting in queue...</span>
  }

  return (
    <div className="min-w-[140px]">
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{STAGE_LABELS[stage] || stage}</span>
        <span className="font-medium text-slate-700">{progress ?? 0}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${
            status === 'failed' ? 'bg-red-500' : 'bg-brand-600'
          }`}
          style={{ width: `${progress ?? 0}%` }}
        />
      </div>
    </div>
  )
}

export { STAGE_LABELS }
