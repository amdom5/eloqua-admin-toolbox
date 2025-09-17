# Eloqua Admin Toolbox

A desktop application for advanced Eloqua administration tasks that are not available through the standard UI.

## Download

Download the latest release for your platform from the [Releases](https://github.com/amdom5/eloqua-admin-toolbox/releases) page:

- **Windows**: Download the `.exe` installer
- **macOS**: Download the `.dmg` file
- **Linux**: Download the `.AppImage` file (portable) or `.snap` package

## Getting Started

1. **Download and Install**: Get the appropriate version for your operating system
2. **Launch the Application**: Open Eloqua Admin Toolbox
3. **Connect to Eloqua**: Enter your Eloqua credentials using either:
   - REST API mode (Company, Username, Password)
   - Browser Login mode (authenticate through your browser)

## Available Tools

### Contact Field Deletion Tool
- **Cleanup Operations**: Remove bulk sync dependencies which often prevent deletion of contact fields

### Email Asset Tool
- **Search and Export**: Find email assets by name, folder, or creation date
- **Detailed Information**: View comprehensive email metadata and settings
- **Bulk Export**: Export multiple emails to Excel with full API data

### Form Asset Tool
- **Form Management**: Search and manage Eloqua forms across your instance
- **Field Analysis**: View form field configurations and validation rules
- **Bulk Operations**: Export form data to Excel

### Campaign Export Tool
- **Campaign Search**: Find and filter campaigns by name, status, or date range
- **Comprehensive Export**: Export campaign details & settings

### Contact Field Export Tool
- **Field Management**: Search and analyze all contact fields in your instance
- **Data Mapping**: Understand field types, validation rules, and dependencies
- **Export Options**: Generate comprehensive field documentation in Excel

### Program Export Tool
- **Program Discovery**: Search and filter programs across your Eloqua instance
- **Detailed Export**: Export program configurations, steps, and settings

### Asset Dependency Tool
- **Dependency Mapping**: Discover relationships between different Eloqua assets
- **Impact Analysis**: Understand what assets depend on others before making changes

### Form Bulk Submit Tool
- **Mass Submissions**: Submit test data to multiple forms simultaneously
- **Data Validation**: Test form validation rules and field requirements
- **Automated Testing**: Streamline form testing workflows


## Security

- **Local Authentication**: Credentials are stored only in your current session
- **Direct API Connection**: All operations connect directly to your Eloqua instance
- **No External Servers**: No data is transmitted to third-party services
- **Secure Communication**: Uses HTTPS and Eloqua's official REST API

## System Requirements

- **Windows**: Windows 10 or later
- **macOS**: macOS 10.14 or later
- **Linux**: Any modern distribution with AppImage support
- **Eloqua Access**: Valid Eloqua user credentials with API permissions

## Support

For issues, feature requests, or questions:
- Check the [Issues](https://github.com/amdom5/eloqua-admin-toolbox/issues) page
- Create a new issue with detailed information about your problem

## License

MIT