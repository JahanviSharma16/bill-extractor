import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const fetchUsers = async () => {
    const res = await api.get('/users')
    setUsers(res.data.users)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId, role) => {
    setMessage('')
    try {
      await api.patch(`/users/${userId}/role`, { role })
      setMessage('User role updated successfully')
      fetchUsers()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed')
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return
    setMessage('')
    try {
      await api.delete(`/users/${userId}`)
      setMessage('User deleted successfully')
      fetchUsers()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-slate-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        Loading users...
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Manage Users"
        subtitle="View and manage platform users and roles"
      />

      {message && (
        <p className={`mb-6 ${message.includes('failed') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </p>
      )}

      <div className="table-wrap overflow-x-auto">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-white">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-slate-50">
                <td className="table-cell font-medium text-slate-900">{user.name}</td>
                <td className="table-cell">{user.email}</td>
                <td className="table-cell">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                    className="input !w-auto !py-1.5"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="table-cell text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="table-cell text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(user._id)}
                    className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
