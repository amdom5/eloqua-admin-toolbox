import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/Dashboard.css'
import { Mail, Link as LinkIcon, Trash2, FileText, ClipboardList } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import logoImage from '../assets/elqtoolbox.png'

function Dashboard() {
  const { credentials } = useAuth()

  const tools = [
    {
      id: 'email-assets',
      title: 'Email Asset Management',
      description: 'Search for email assets and export detailed API information to CSV',
      icon: Mail,
      path: '/email-assets',
      features: ['Search by name or ID', 'Export to CSV', 'View content and metadata'],
    },
    {
      id: 'form-assets',
      title: 'Form Asset Management',
      description: 'Search for form assets and export detailed API information',
      icon: FileText,
      path: '/form-assets',
      features: ['Search by name or ID', 'Export to CSV', 'View elements and metadata'],
    },
    {
      id: 'form-bulk-submit',
      title: 'Form Bulk Submit',
      description: 'Submit form data in bulk from CSV files to Eloqua forms',
      icon: ClipboardList,
      path: '/form-bulk-submit',
      features: ['CSV import', 'Progress tracking', 'Validation mode'],
    },
    {
      id: 'dependencies',
      title: 'Dependency Analyzer',
      description: 'Analyze and map relationships between different Eloqua assets',
      icon: LinkIcon,
      path: '/dependencies',
      features: ['Dependency mapping', 'Usage analysis', 'Impact assessment'],
    },
    {
      id: 'bulk-sync-deletion',
      title: 'Bulk Sync Deletion',
      description: 'Delete multiple Eloqua bulk syncs efficiently with safety features',
      icon: Trash2,
      path: '/bulk-sync-deletion',
      features: ['CSV import', 'Dry run validation', 'Progress tracking'],
    },
  ]

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <img src={logoImage} alt="Eloqua Admin Toolbox" className="dashboard-logo-image" />
        </div>
        <h1>Welcome to Eloqua Admin Toolbox</h1>
        <p>
          Connected to <strong>{credentials?.siteName}</strong> as{' '}
          <strong>{credentials?.username}</strong>
        </p>
      </div>

      <div className="dashboard-grid">
        {tools.map((tool) => (
          <div key={tool.id} className="tool-card">
            <div className="card-header">
              <span className="card-icon">
                <Icon icon={tool.icon} size={28} />
              </span>
              <h3 className="card-title">{tool.title}</h3>
            </div>
            
            <p className="tool-description">{tool.description}</p>
            
            <ul className="tool-features">
              {tool.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            
            <Link to={tool.path} className="btn btn-primary tool-btn">
              Open Tool
            </Link>
          </div>
        ))}
      </div>

      <div className="dashboard-info">
        <div className="info-card">
          <h3>About This Application</h3>
          <p>
            This desktop application provides advanced administrative tools for Eloqua
            that are not available through the standard UI. All operations are performed
            using the Eloqua REST API with your authenticated session.
          </p>
          <ul>
            <li>Your credentials are stored only in this session</li>
            <li>No data is sent to external servers</li>
            <li>All operations are performed directly with your Eloqua instance</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Dashboard