// Form Bulk Submit Examples and Templates

export const csvExamples = {
  // Basic contact form example
  contactForm: `firstName,lastName,emailAddress,company,phone
John,Doe,john.doe@example.com,ACME Corp,(555) 123-4567
Jane,Smith,jane.smith@company.com,Tech Solutions,(555) 987-6543
Mike,Johnson,mike.j@business.org,Global Inc,(555) 456-7890
Sarah,Williams,sarah.w@enterprise.net,Future Systems,(555) 321-0987`,

  // Lead generation form with custom fields
  leadGenForm: `firstName,lastName,emailAddress,company,industry,jobTitle,phone,website
Alice,Brown,alice.brown@startup.com,Innovation Labs,Technology,CTO,(555) 111-2222,https://innovationlabs.com
Bob,Davis,bob.davis@manufacturing.com,Steel Works,Manufacturing,Operations Manager,(555) 333-4444,https://steelworks.com
Carol,Wilson,carol.wilson@healthcare.org,MedCare Plus,Healthcare,Director,(555) 555-6666,https://medcareplus.org
David,Taylor,david.taylor@finance.net,Capital Group,Finance,Analyst,(555) 777-8888,https://capitalgroup.net`,

  // Event registration form
  eventRegistration: `firstName,lastName,emailAddress,company,attendeeType,dietaryRestrictions,sessionInterest
Emily,Anderson,emily.a@tech.com,TechCorp,Speaker,Vegetarian,AI & Machine Learning
Frank,Thomas,frank.thomas@startup.io,StartupHub,Attendee,None,Cloud Computing
Grace,Martinez,grace.m@consulting.biz,ConsultPro,Sponsor,Gluten-free,Digital Transformation
Henry,Garcia,henry.garcia@enterprise.org,BigCorp,VIP,Vegan,Cybersecurity`,

  // Webinar registration with custom tracking
  webinarRegistration: `firstName,lastName,emailAddress,company,jobTitle,utm_source,utm_campaign,utm_medium
Isabella,Rodriguez,isabella.r@company.com,DataCorp,Data Scientist,linkedin,q1-webinar,social
Jack,Lee,jack.lee@business.net,Analytics Inc,Manager,google,q1-webinar,cpc
Kelly,White,kelly.white@org.gov,GovTech,Director,email,q1-webinar,email
Luis,Hernandez,luis.h@nonprofit.org,Community First,Coordinator,facebook,q1-webinar,social`,

  // Product demo request with qualification
  productDemo: `firstName,lastName,emailAddress,company,phone,employees,budget,timeline,productInterest
Maria,Lopez,maria.lopez@enterprise.com,Enterprise Solutions,(555) 123-9999,500-1000,$50000-100000,Q2 2025,Enterprise Platform
Noah,Clark,noah.clark@midsize.biz,MidSize Corp,(555) 456-1111,100-500,$10000-50000,Q3 2025,Professional Edition
Olivia,Lewis,olivia.lewis@startup.tech,TechStart,(555) 789-2222,10-50,$1000-10000,Q1 2025,Startup Package
Paul,Walker,paul.walker@consulting.pro,ConsultPro,(555) 321-3333,50-100,$25000-50000,Q2 2025,Consultant Tools`
}

export const parameterExamples = {
  // Basic usage example
  basicSubmission: {
    operation: "submit",
    siteId: "123",
    elqFormName: "ContactForm2025",
    csvData: csvExamples.contactForm,
    requestTimeout: 10,
    delayBetweenRequests: 100,
    maxConcurrentRequests: 5
  },

  // Validation only example
  validationOnly: {
    operation: "submit",
    siteId: "123", 
    elqFormName: "LeadGenForm",
    csvData: csvExamples.leadGenForm,
    validateOnly: true
  },

  // High volume with rate limiting
  highVolumeSubmission: {
    operation: "submit",
    siteId: "456",
    elqFormName: "EventRegistration2025",
    csvData: csvExamples.eventRegistration,
    requestTimeout: 15,
    delayBetweenRequests: 200,
    maxConcurrentRequests: 3
  },

  // Fast processing for smaller datasets
  fastProcessing: {
    operation: "submit",
    siteId: "789",
    elqFormName: "WebinarSignup",
    csvData: csvExamples.webinarRegistration,
    requestTimeout: 5,
    delayBetweenRequests: 50,
    maxConcurrentRequests: 10
  }
}

export const usageGuide = {
  csvFormat: {
    title: "CSV Format Requirements",
    requirements: [
      "First row must contain column headers",
      "Headers should match form field names",
      "Use UTF-8 encoding",
      "Comma-separated values",
      "Quote values containing commas or quotes",
      "Empty rows will be skipped"
    ],
    example: `firstName,lastName,emailAddress
John,Doe,john.doe@example.com
Jane,"Smith, Jr.",jane.smith@company.com`
  },

  formFieldMapping: {
    title: "Form Field Mapping",
    description: "CSV column headers should match Eloqua form field HTML names",
    commonFields: {
      "firstName": "First Name field",
      "lastName": "Last Name field", 
      "emailAddress": "Email Address field",
      "company": "Company field",
      "phone": "Phone Number field",
      "jobTitle": "Job Title field",
      "industry": "Industry field",
      "website": "Website field"
    },
    customFields: {
      description: "Custom fields use their HTML names as defined in Eloqua",
      example: "For a custom field 'Product Interest', the CSV header might be 'productInterest' or 'product_interest'"
    }
  },

  bestPractices: {
    title: "Best Practices",
    tips: [
      "Start with validateOnly=true to test your data",
      "Use appropriate delays between requests to avoid rate limiting",
      "Monitor the success rate and adjust concurrent requests if needed",
      "Test with a small sample before processing large datasets",
      "Ensure form field names match exactly",
      "Include tracking parameters (utm_source, utm_campaign) for attribution"
    ]
  },

  troubleshooting: {
    title: "Common Issues",
    issues: [
      {
        problem: "Low success rate",
        solutions: [
          "Check form field name mapping",
          "Verify site ID is correct",
          "Ensure form is published and active",
          "Reduce concurrent requests",
          "Increase delays between requests"
        ]
      },
      {
        problem: "Timeout errors",
        solutions: [
          "Increase request timeout",
          "Reduce concurrent requests",
          "Check network connectivity",
          "Try during off-peak hours"
        ]
      },
      {
        problem: "CSV parsing errors",
        solutions: [
          "Check file encoding (should be UTF-8)",
          "Verify CSV format and quotes",
          "Ensure headers are in first row",
          "Remove empty rows and columns"
        ]
      }
    ]
  },

  rateLimit: {
    title: "Rate Limiting Guidelines",
    description: "Eloqua has rate limits for form submissions",
    recommendations: [
      "For datasets < 100 rows: 5-10 concurrent requests, 50-100ms delay",
      "For datasets 100-1000 rows: 3-5 concurrent requests, 100-200ms delay", 
      "For datasets > 1000 rows: 1-3 concurrent requests, 200-500ms delay",
      "Monitor success rates and adjust accordingly",
      "Consider breaking large datasets into smaller batches"
    ]
  }
}

export default { csvExamples, parameterExamples, usageGuide }