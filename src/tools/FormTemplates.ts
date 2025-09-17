// Form Management Templates and Examples

export const formTemplates = {
  // Basic form structure for creating new forms
  basicForm: {
    name: "New Contact Form",
    htmlName: "new_contact_form",
    description: "Basic contact form with essential fields",
    processingType: "internallyMapped",
    submitStyle: "redirect",
    submitMessage: "Thank you for your submission!",
    isResponsive: true,
    elements: [
      {
        type: "FormField",
        name: "First Name",
        htmlName: "firstName",
        dataType: "text",
        displayType: "text",
        style: "width: 100%;",
        validations: {
          isRequired: true,
          maxLength: 50
        }
      },
      {
        type: "FormField", 
        name: "Last Name",
        htmlName: "lastName",
        dataType: "text",
        displayType: "text",
        style: "width: 100%;",
        validations: {
          isRequired: true,
          maxLength: 50
        }
      },
      {
        type: "FormField",
        name: "Email Address",
        htmlName: "emailAddress",
        dataType: "emailAddress",
        displayType: "text",
        style: "width: 100%;",
        validations: {
          isRequired: true,
          isEmailAddress: true
        }
      },
      {
        type: "FormField",
        name: "Company",
        htmlName: "company", 
        dataType: "text",
        displayType: "text",
        style: "width: 100%;",
        validations: {
          maxLength: 100
        }
      },
      {
        type: "FormSubmitButton",
        name: "Submit",
        htmlName: "submit",
        style: "background-color: #007cba; color: white; padding: 10px 20px; border: none; cursor: pointer;"
      }
    ]
  },

  // Field templates for common field types
  fieldTemplates: {
    textField: {
      type: "FormField",
      name: "Text Field",
      htmlName: "text_field",
      dataType: "text",
      displayType: "text",
      style: "width: 100%;",
      validations: {
        maxLength: 255
      }
    },
    
    emailField: {
      type: "FormField",
      name: "Email Address",
      htmlName: "email_address",
      dataType: "emailAddress", 
      displayType: "text",
      style: "width: 100%;",
      validations: {
        isRequired: true,
        isEmailAddress: true
      }
    },

    phoneField: {
      type: "FormField",
      name: "Phone Number",
      htmlName: "phone_number",
      dataType: "text",
      displayType: "text",
      style: "width: 100%;",
      validations: {
        maxLength: 20,
        pattern: "^[+]?[0-9\\s\\-\\(\\)]+$"
      }
    },

    selectField: {
      type: "FormField",
      name: "Select Option",
      htmlName: "select_option",
      dataType: "text",
      displayType: "dropDown",
      style: "width: 100%;",
      options: [
        { displayName: "Option 1", value: "option1" },
        { displayName: "Option 2", value: "option2" },
        { displayName: "Option 3", value: "option3" }
      ],
      validations: {
        isRequired: false
      }
    },

    checkboxField: {
      type: "FormField",
      name: "Checkbox Field",
      htmlName: "checkbox_field", 
      dataType: "text",
      displayType: "checkBox",
      style: "margin: 10px 0;",
      defaultValue: "false",
      validations: {}
    },

    textareaField: {
      type: "FormField",
      name: "Message",
      htmlName: "message",
      dataType: "largeText",
      displayType: "textArea",
      style: "width: 100%; height: 100px;",
      validations: {
        maxLength: 2000
      }
    },

    hiddenField: {
      type: "FormField",
      name: "Hidden Field",
      htmlName: "hidden_field",
      dataType: "text", 
      displayType: "hidden",
      defaultValue: "",
      validations: {}
    },

    submitButton: {
      type: "FormSubmitButton",
      name: "Submit",
      htmlName: "submit",
      style: "background-color: #007cba; color: white; padding: 10px 20px; border: none; cursor: pointer;"
    }
  },

  // Common validation patterns
  validationTemplates: {
    required: {
      isRequired: true
    },
    
    email: {
      isRequired: true,
      isEmailAddress: true
    },

    phone: {
      pattern: "^[+]?[0-9\\s\\-\\(\\)]+$",
      maxLength: 20
    },

    url: {
      pattern: "^https?://.*",
      maxLength: 500
    },

    numeric: {
      pattern: "^[0-9]+$"
    },

    alphanumeric: {
      pattern: "^[a-zA-Z0-9]+$"
    },

    zipCode: {
      pattern: "^[0-9]{5}(-[0-9]{4})?$",
      maxLength: 10
    }
  }
}

export const formExamples = {
  // Example for creating a lead generation form
  leadGenForm: {
    operation: "create",
    formData: {
      name: "Lead Generation Form",
      htmlName: "lead_generation_form",
      description: "Form to capture qualified leads",
      processingType: "internallyMapped",
      submitStyle: "redirect",
      submitMessage: "Thank you! We'll be in touch soon.",
      isResponsive: true,
      elements: [
        {
          type: "FormField",
          name: "First Name",
          htmlName: "firstName",
          dataType: "text",
          displayType: "text",
          validations: { isRequired: true, maxLength: 50 }
        },
        {
          type: "FormField", 
          name: "Last Name",
          htmlName: "lastName",
          dataType: "text",
          displayType: "text",
          validations: { isRequired: true, maxLength: 50 }
        },
        {
          type: "FormField",
          name: "Business Email",
          htmlName: "emailAddress",
          dataType: "emailAddress",
          displayType: "text",
          validations: { isRequired: true, isEmailAddress: true }
        },
        {
          type: "FormField",
          name: "Company",
          htmlName: "company",
          dataType: "text", 
          displayType: "text",
          validations: { isRequired: true, maxLength: 100 }
        },
        {
          type: "FormField",
          name: "Industry",
          htmlName: "industry",
          dataType: "text",
          displayType: "dropDown",
          options: [
            { displayName: "Technology", value: "technology" },
            { displayName: "Healthcare", value: "healthcare" },
            { displayName: "Finance", value: "finance" },
            { displayName: "Manufacturing", value: "manufacturing" },
            { displayName: "Other", value: "other" }
          ],
          validations: { isRequired: true }
        },
        {
          type: "FormSubmitButton",
          name: "Get Started",
          htmlName: "submit"
        }
      ]
    }
  },

  // Example for adding a field to an existing form
  addEmailField: {
    operation: "manage-fields",
    formId: "12345", // Replace with actual form ID
    fieldData: {
      action: "add",
      field: {
        type: "FormField",
        name: "Work Email",
        htmlName: "work_email",
        dataType: "emailAddress",
        displayType: "text",
        validations: {
          isRequired: false,
          isEmailAddress: true
        }
      }
    }
  },

  // Example for updating field validation
  updateFieldValidation: {
    operation: "manage-fields", 
    formId: "12345", // Replace with actual form ID
    fieldId: "67890", // Replace with actual field ID
    fieldData: {
      action: "update",
      field: {
        validations: {
          isRequired: true,
          maxLength: 100,
          pattern: "^[a-zA-Z\\s]+$"
        }
      }
    }
  },

  // Example for form analytics
  analyzeFormPerformance: {
    operation: "analyze",
    formId: "12345", // Replace with actual form ID
    startDate: "2025-01-01",
    endDate: "2025-01-31"
  },

  // Example for exporting form submissions
  exportSubmissions: {
    operation: "export-submissions",
    formId: "12345", // Replace with actual form ID
    startDate: "2025-01-01", 
    endDate: "2025-01-31",
    exportFormat: "csv",
    maxResults: 1000
  }
}

export default { formTemplates, formExamples }