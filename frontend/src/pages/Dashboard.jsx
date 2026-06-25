import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import ProcessingProgress from '../components/ProcessingProgress'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents')
      setDocuments(res.data.documents)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
    const interval = setInterval(fetchDocuments, 4000)
    return () => clearInterval(interval)
  }, [])

  const stats = {
    total: documents.length,
    processing: documents.filter((d) => ['uploaded', 'processing'].includes(d.status)).length,
    approved: documents.filter((d) => d.status === 'approved').length,
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle={
          user?.role === 'admin'
            ? 'All uploaded bills across users'
            : 'Your uploaded utility bills and invoices'
        }
        action={
          <Link to="/upload" className="btn-primary">
            + Upload Bills
          </Link>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Documents', value: stats.total, color: 'text-slate-900' },
          { label: 'Processing', value: stats.processing, color: 'text-amber-600' },
          { label: 'Approved', value: stats.approved, color: 'text-brand-600' },
        ].map((stat) => (
          <div key={stat.label} className="card !p-5">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">
            📄
          </div>
          <p className="font-medium text-slate-900">No documents yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Upload your first utility bill to get started
          </p>
          <Link to="/upload" className="btn-primary mt-6 inline-flex">
            Upload Bills
          </Link>
        </div>
      ) : (
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-border">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3 text-left">File</th>
                {user?.role === 'admin' && <th className="px-4 py-3 text-left">User</th>}
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Vendor</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Progress</th>
                <th className="px-4 py-3 text-left">Confidence</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-white">
              {documents.map((doc) => (
                <tr key={doc._id} className="transition hover:bg-slate-50">
                  <td className="table-cell font-medium text-slate-900">{doc.originalName}</td>
                  {user?.role === 'admin' && (
                    <td className="table-cell">{doc.userId?.name || '—'}</td>
                  )}
                  <td className="table-cell capitalize">
                    {doc.extractedData?.document_type?.replace(/_/g, ' ') || '—'}
                  </td>
                  <td className="table-cell">{doc.extractedData?.vendor || '—'}</td>
                  <td className="table-cell">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="table-cell">
                    <ProcessingProgress
                      stage={doc.processingStage}
                      progress={doc.processingProgress}
                      status={doc.status}
                    />
                  </td>
                  <td className="table-cell">
                    {doc.extractedData?.confidence_score != null ? (
                      <span className="font-medium text-slate-900">
                        {Math.round(doc.extractedData.confidence_score * 100)}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <Link to={`/documents/${doc._id}`} className="link">
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
