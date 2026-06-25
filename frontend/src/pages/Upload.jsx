import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import ProcessingProgress from '../components/ProcessingProgress'
import StatusBadge from '../components/StatusBadge'

export default function Upload() {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [dragActive, setDragActive] = useState(false)

  const addFiles = useCallback((incoming) => {
    const allowed = Array.from(incoming).filter((file) =>
      ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(file.type)
    )
    setFiles((prev) => [...prev, ...allowed].slice(0, 10))
    setError('')
    setSuccess('')
  }, [])

  const handleFileChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!files.length) {
      setError('Please select at least one file')
      return
    }

    const formData = new FormData()
    const fieldName = files.length === 1 ? 'document' : 'documents'
    files.forEach((file) => formData.append(fieldName, file))

    setUploading(true)
    setProgress(0)
    setError('')
    setUploadedDocs([])

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total))
          }
        },
      })

      setSuccess(res.data.message)
      setUploadedDocs(res.data.documents)
      setFiles([])
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!uploadedDocs.length) return

    const interval = setInterval(async () => {
      const updated = await Promise.all(
        uploadedDocs.map(async (doc) => {
          const res = await api.get(`/documents/${doc._id}`)
          return res.data.document
        })
      )
      setUploadedDocs(updated)

      const allDone = updated.every((doc) =>
        ['processed', 'approved', 'failed'].includes(doc.status)
      )
      if (allDone) clearInterval(interval)
    }, 3000)

    return () => clearInterval(interval)
  }, [uploadedDocs])

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Upload Bills"
        subtitle="PDF, PNG, JPG or JPEG — single or multiple files (up to 10)"
      />

      <form onSubmit={handleUpload} className="card">
        <label
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 transition ${
            dragActive
              ? 'border-brand-500 bg-brand-50'
              : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50'
          }`}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
            📁
          </div>
          <span className="text-sm font-medium text-slate-700">
            Click to browse or drag files here
          </span>
          <span className="mt-1.5 text-xs text-slate-500">
            PDF, PNG, JPG, JPEG — max 10 files
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {files.length > 0 && (
          <ul className="mt-5 space-y-2">
            {files.map((file) => (
              <li
                key={`${file.name}-${file.size}`}
                className="flex items-center justify-between rounded-lg border border-surface-border bg-slate-50 px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-slate-800">{file.name}</span>
                <span className="text-slate-500">{Math.round(file.size / 1024)} KB</span>
              </li>
            ))}
          </ul>
        )}

        {uploading && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm text-slate-600">
              <span>Uploading to server...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && <p className="alert-error mt-5">{error}</p>}
        {success && <p className="alert-success mt-5">{success}</p>}

        <button
          type="submit"
          disabled={uploading || !files.length}
          className="btn-primary mt-6 w-full"
        >
          {uploading ? 'Uploading...' : 'Upload & Process'}
        </button>
      </form>

      {uploadedDocs.length > 0 && (
        <div className="card mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Processing Status</h2>
          <ul className="mt-5 space-y-3">
            {uploadedDocs.map((doc) => (
              <li
                key={doc._id}
                className="rounded-lg border border-surface-border bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doc.originalName}</p>
                    <div className="mt-2">
                      <StatusBadge status={doc.status} />
                    </div>
                  </div>
                  <ProcessingProgress
                    stage={doc.processingStage}
                    progress={doc.processingProgress}
                    status={doc.status}
                  />
                </div>
                {['processed', 'approved'].includes(doc.status) && (
                  <Link to={`/documents/${doc._id}`} className="link mt-3 inline-block">
                    View extraction result →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Processing Pipeline</h2>
        <ol className="mt-4 space-y-3">
          {[
            'File uploaded and stored in MongoDB + queued in Redis (BullMQ)',
            'OCR: PDF text extraction → Tesseract fallback if needed',
            'AI Agent: classify document → detect vendor → extract fields',
            'Validation: missing fields, incorrect units, duplicates',
            'Human review and approval',
          ].map((step, i) => (
            <li key={step} className="flex gap-3 text-sm text-slate-600">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
