# Eloqua Admin Toolbox - Claude Code Instructions

## Code Style Guidelines

### Emoji Usage
**IMPORTANT: Do not use any emojis in this application.**

- **No emojis in code files** (TypeScript, JavaScript, CSS, HTML)
- **No emojis in user interface text** (buttons, labels, messages, tooltips)
- **No emojis in comments or documentation**
- **No emojis in error messages or status updates**
- **No emojis in component names or file names**

Use clear, professional text instead:
- ✅ Good: "Success", "Error", "Warning", "Info"
- ❌ Avoid: "✅", "❌", "⚠️", "ℹ️", "🌐", "📧", etc.

### Professional Interface Standards
This is a business application for Eloqua administrators. Maintain a professional, enterprise-grade interface:

- Use clear, descriptive text labels
- Employ standard iconography when needed (text-based or SVG icons)
- Focus on functionality and usability over decorative elements
- Maintain consistency with enterprise software conventions

### Exception
The only emojis currently in the codebase are in the login interface mode tabs ("📡 REST API" and "🌐 Browser Login"). These should be replaced with text or removed in future updates to maintain consistency.

## Development Practices

- Write clean, professional code
- Use meaningful variable and function names  
- Add clear comments where necessary
- Follow TypeScript/React best practices
- Maintain consistent formatting and structure

This ensures the application maintains a professional appearance suitable for enterprise environments.

## API Documentation

The Eloqua API documentation is available in the following YAML files:

- `api-ref-header.yaml` - API header definitions
- `api-ref-general-assets.yaml` - General assets API reference
- `api-ref-email-assets.yaml` - Email assets API reference
- `api-ref-form-assets.yaml` - Form assets API reference
- `api-ref-other-assets.yaml` - Other assets API reference
- `api-ref-definitions-1.yaml` - API definitions (part 1)
- `api-ref-definitions-2.yaml` - API definitions (part 2)

These files contain comprehensive API specifications for working with Eloqua's REST API endpoints.