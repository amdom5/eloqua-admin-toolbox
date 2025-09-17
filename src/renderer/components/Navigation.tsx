import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../styles/Navigation.css'
import { 
  BarChart3, 
  Mail, 
  Link as LinkIcon, 
  Trash2, 
  FileText, 
  ClipboardList 
} from 'lucide-react'
import Icon from '../../components/ui/Icon'

interface NavItem {
  path: string
  label: string
  icon?: React.ComponentType
  description?: string
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: BarChart3,
    description: 'Overview and quick actions'
  },
  {
    path: '/email-assets',
    label: 'Email Asset Management',
    icon: Mail,
    description: 'Search and export email data'
  },
  {
    path: '/form-assets',
    label: 'Form Asset Management',
    icon: FileText,
    description: 'Search and export form data'
  },
  {
    path: '/form-bulk-submit',
    label: 'Form Bulk Submit',
    icon: ClipboardList,
    description: 'Submit CSV data to Eloqua forms'
  },
  {
    path: '/dependencies',
    label: 'Dependency Analyzer',
    icon: LinkIcon,
    description: 'Analyze asset relationships'
  },
  {
    path: '/bulk-sync-deletion',
    label: 'Bulk Sync Deletion',
    icon: Trash2,
    description: 'Delete multiple bulk syncs efficiently'
  },
]

function Navigation() {
  const location = useLocation()

  return (
    <nav className="navigation">
      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.path} className="nav-item">
            <Link
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">
                {item.icon && <Icon icon={item.icon} size={18} />}
              </span>
              <div className="nav-content">
                <span className="nav-label">{item.label}</span>
                {item.description && (
                  <span className="nav-description">{item.description}</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Navigation