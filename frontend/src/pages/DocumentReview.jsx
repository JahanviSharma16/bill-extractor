import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import ProcessingProgress from '../components/ProcessingProgress'
import StatusBadge from '../components/StatusBadge'

export default function DocumentReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [document, setDocument] = useState(null)
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filePreviewUrl, setFilePreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const previewUrlRef = useRef('')

  const fetchDocument = async () => {
    const res = await api.get(`/documents/${id}`)
    const doc = res.data.document
    setDocument(doc)
    setFormData(doc.correctedData || doc.extractedData || {})
    setLoading(false)
  }

  useEffect(() => {
    fetchDocument()
    const interval = setInterval(() => {
      if (document?.status === 'processing' || document?.status === 'uploaded') {
        fetchDocument()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [id, document?.status])

  useEffect(() => {
    const loadPreview = async () => {
      if (!document || ['uploaded', 'processing'].includes(document.status)) {
        return
      }

      setPreviewLoading(true)
      setPreviewError('')

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = ''
        setFilePreviewUrl('')
      }

      try {
        const res = await api.get(`/documents/${id}/file`, { responseType: 'blob' })

        if (!res.data || res.data.size === 0) {
          throw new Error('Empty file response')
        }

        const blob = new Blob([res.data], {
          type: document.mimeType || res.headers['content-type'] || 'application/pdf',
        })
        const objectUrl = URL.createObjectURL(blob)
        previewUrlRef.current = objectUrl
        setFilePreviewUrl(objectUrl)
      } catch {
        setPreviewError('Could not load document preview')
        setFilePreviewUrl('')
      } finally {
        setPreviewLoading(false)
      }
    }

    loadPreview()

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = ''
      }
    }
  }, [id, document?.status, document?._id, document?.mimeType])

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await api.patch(`/documents/${id}`, { correctedData: formData })
      setDocument(res.data.document)
      setMessage('Corrections saved — validation re-run')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    setSaving(true)
    setMessage('')
    try {
      await api.patch(`/documents/${id}`, { correctedData: formData })
      const res = await api.post(`/documents/${id}/approve`, { finalData: formData })
      setDocument(res.data.document)
      setMessage('Document approved successfully')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Approval failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-slate-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        Loading document...
      </div>
    )
  }

  if (!document) {
    return <p className="alert-error inline-block">Document not found</p>
  }

  const isProcessing = ['uploaded', 'processing'].includes(document.status)
  const isPdf = document.mimeType === 'application/pdf'
  const isImage = document.mimeType?.startsWith('image/')

  return (
    <div>
      <button type="button" onClick={() => navigate('/')} className="link mb-6">
        ← Back to dashboard
      </button>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{document.originalName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={document.status} />
            {document.ocrMethod && (
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                OCR: {document.ocrMethod}
              </span>
            )}
          </div>
          <div className="mt-4 max-w-sm">
            <ProcessingProgress
              stage={document.processingStage}
              progress={document.processingProgress}
              status={document.status}
            />
          </div>
        </div>

        {(document.status === 'processed' || document.status === 'approved') && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || document.approvalStatus}
              className="btn-secondary"
            >
              Save Corrections
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving || document.approvalStatus}
              className="btn-primary"
            >
              {document.approvalStatus ? 'Approved' : 'Approve'}
            </button>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="alert-info mb-6">
          Document is being processed. This page will update automatically.
        </div>
      )}

      {document.status === 'failed' && (
        <div className="alert-error mb-6">
          Processing failed: {document.errorMessage || 'Unknown error'}
        </div>
      )}

      {document.validationWarnings?.length > 0 && (
        <div className="alert-warning mb-6">
          <h2 className="font-semibold">Validation Warnings</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {document.validationWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-lg font-semibold text-slate-900">Original Document</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-surface-border bg-slate-50">
            {previewLoading ? (
              <div className="flex h-[500px] items-center justify-center gap-3 text-slate-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                Loading preview...
              </div>
            ) : isPdf && filePreviewUrl ? (
              <iframe
                title="Document preview"
                src={filePreviewUrl}
                className="h-[500px] w-full bg-white"
              />
            ) : isImage && filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt={document.originalName}
                className="max-h-[500px] w-full bg-white object-contain"
              />
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center p-8 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                  📄
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {isProcessing ? 'Preview available after processing' : 'Preview not available'}
                </p>
                {previewError && (
                  <p className="mt-1 text-xs text-red-500">{previewError}</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold text-slate-900">Extracted Fields</h2>
          <p className="mt-1 text-sm text-slate-500">Edit values before approval</p>

          <div className="mt-6 max-h-[500px] space-y-4 overflow-y-auto pr-1">
            {Object.keys(formData).length === 0 ? (
              <p className="text-sm text-slate-500">No extracted data yet</p>
            ) : (
              Object.entries(formData).map(([key, value]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    disabled={document.approvalStatus}
                    className="input"
                  />
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold text-slate-900">OCR Output</h2>
        <pre className="mt-4 max-h-[300px] overflow-auto rounded-lg border border-surface-border bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
          {document.ocrText || 'OCR text not available yet'}
        </pre>
      </section>

      <section className="card mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Standardized JSON Output</h2>
        <pre className="mt-4 overflow-auto rounded-lg border border-surface-border bg-slate-50 p-4 text-xs text-slate-800">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </section>

      {message && <p className="alert-success mt-4">{message}</p>}
    </div>
  )
}
