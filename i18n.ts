export const translations = {
  nav: {
    configurator: 'Configurator',
    adminDashboard: 'Admin Dashboard',
    internalLogin: 'Internal Login',
    logout: 'Logout',
    loggedInAs: 'Logged in as'
  },
  footer: {
    copyright: '© 2024 ONCCY Industries. All rights reserved.'
  },
  login: {
    title: 'Internal Access',
    subtitle: 'Sign in to manage product inventory',
    usernameLabel: 'Username',
    usernamePlaceholder: 'e.g. pm or marketing',
    passwordLabel: 'Password',
    signIn: 'Sign in',
    invalidCredentials: 'Invalid credentials.',
    pmHint: 'Product Manager: pm / pm123',
    marketingHint: 'Marketing: marketing / mkt123'
  },
  configurator: {
    heroKicker: 'Products / Product Configurator',
    sidebarTitle: 'Filters',
    sidebarReset: 'Reset',
    productsHeading: 'Products',
    noResultsTitle: 'No products found',
    noResultsBody: 'Adjust your filters to see more results.',
    noResultsClear: 'Clear Filters',
    card: {
      variantsSuffix: 'Variants',
      contactType: 'Contact Type',
      colorFrontBezel: 'Color Front Bezel',
      color: 'Color',
      colorRing: 'Color light ring'
    }
  },
  productDetail: {
    backToConfigurator: 'Back to Configurator',
    exportPdf: 'Export PDF Datasheet',
    productImage: 'Product Image',
    visualization3d: '3D Visualization',
    interactive: 'Interactive',
    dragHint: 'Drag to rotate • Scroll to zoom',
    technicalSpecifications: 'Technical Specifications',
    generalData: 'General Data',
    design: 'Design',
    mechContacts: 'Mechanical & Contacts',
    availableContactTypes: 'Available Contact Types',
    labels: {
      protectionClass: 'Protection Class',
      illumination: 'Illumination',
      ringIllumination: 'Ring Illumination',
      shape: 'Shape',
      mountingHole: 'Mounting Hole',
      bezelColor: 'Bezel Color',
      connectionMaterial: 'Connection Material',
      connectionType: 'Connection Type',
      switchingFunction: 'Switching Function',
      noneSpecified: 'None specified',
      categoryType: 'Category',
      inputString: 'Input String',
      outputString: 'Output String',
      voltage: 'Voltage'
    }
  },
  admin: {
    title: 'Product Management',
    welcomeBack: 'Welcome back, {username}',
    manageHomepage: 'Manage Homepage',
    resetDb: 'Reset DB',
    resetDbTitle: 'Clear all data and reset defaults',
    addNewProduct: 'Add New Product',
    table: {
      product: 'Product',
      classification: 'Classification',
      techData: 'Tech Data',
      actions: 'Actions',
      emptyState: 'No products found. Add a new product to get started.'
    },
    settingsModal: {
      title: 'Homepage Settings',
      heroTitle: 'Hero Title',
      heroSubtitle: 'Hero Subtitle',
      heroBackground: 'Hero Background Image',
      heroHint: 'Recommended: 1920x600px, dark themed image.',
      saveSettings: 'Save Settings',
      companyName: 'Company name',
      logoLabel: 'Logo',
      logoHint: 'Upload a small horizontal logo. It will appear in the header.'
    },
    editModal: {
      editProduct: 'Edit Product',
      addProduct: 'Add New Product',
      generalTab: 'General Info',
      detailedTab: 'Technical Data',
      productName: 'Product Name',
      rubricCategory: 'Rubric (Category)',
      series: 'Series',
      availableColors: 'Available Colors',
      model3dLabel: '3D Model (GLB/GLTF)',
      model3dHint: 'Upload a GLB/GLTF file (Max 5MB).',
      model3dUrlLabel: 'Or paste model URL',
      model3dUrlPlaceholder: 'https://example.com/model.glb',
      colorImagesLabel: 'Color Variant Images',
      colorImagesHint: 'Upload specific images for each selected color. These will be displayed when the user selects the color in the configurator.',
      colorImageUrlPlaceholder: 'Or paste image URL (https://...)',
      remove: 'Remove',
      aiButton: 'Auto-Fill Technical Data with AI',
      aiButtonDisabledReason: 'Please enter a Name and Rubric first.',
      save: 'Save Product',
      cancel: 'Cancel'
    },
    dialogs: {
      noPermissionDelete: 'You do not have permission to delete products.',
      confirmDelete: 'Are you sure you want to delete this product? This action cannot be undone.',
      confirmResetDb: 'DANGER: This will delete ALL products and reset the database to default. Are you sure?',
      saveSettingsFailed: 'Failed to save settings',
      saveSettingsFailedSuffix: 'Failed to save settings: {message}',
      imageProcessFailed: 'Failed to process image.',
      modelTooLarge: 'Error: File too large. Please upload a GLB/GLTF file smaller than 5MB.',
      aiGenerateFailed: 'Failed to generate content. Please check your API configuration.',
      resetCodePrompt: 'Enter reset code to proceed (1234):',
      resetCodeWrong: 'Incorrect reset code.'
    },
    tooltips: {
      editProduct: 'Edit Product',
      deleteProduct: 'Delete Product',
      deleteDenied: 'Permission Denied'
    }
  },
  pdf: {
    title: 'Product Datasheet',
    classification: 'Classification',
    generalData: 'General Data',
    design: 'Design',
    mechContacts: 'Mechanical & Contacts',
    labels: {
      series: 'Series',
      rubric: 'Rubric',
      protectionClassFront: 'Protection Class Front',
      illumination: 'Illumination',
      ringIllumination: 'Ring Illumination',
      shape: 'Shape',
      mountingHole: 'Mounting Hole',
      colorFrontBezel: 'Color Front Bezel',
      connectionMaterial: 'Connection Material',
      connectionType: 'Connection Type',
      switchingFunction: 'Switching Function',
      availableContactTypes: 'Available Contact Types'
    }
  }
} as const;

export const t = translations;
