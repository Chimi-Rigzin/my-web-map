require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/widgets/LayerList",
  "esri/widgets/Search",
  "esri/widgets/BasemapToggle",
  "esri/widgets/Measurement",
  "esri/widgets/Expand",
  "esri/Graphic",
  "esri/widgets/Locate"
], function(
  Map, MapView, GeoJSONLayer, LayerList,
  Search, BasemapToggle, Measurement, Expand,
  Graphic, Locate
) {
  // Initialize statistics object
  const statistics = {
    totalParks: 0,
    totalCorridors: 0,
    totalForests: 0,
    totalArea: 0
  };

  // National Parks Layer
  const nationalParksLayer = new GeoJSONLayer({
    url: "./data/national_parks.geojson",
    title: "National Parks",
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [34, 139, 34, 0.6],
        outline: {
          color: [0, 100, 0],
          width: 2
        }
      }
    },
    popupEnabled: false,
    outFields: ["*"]
  });

  // Biological Corridors Layer
  const corridorsLayer = new GeoJSONLayer({
    url: "./data/biological_corridors.geojson",
    title: "Biological Corridors",
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [255, 165, 0, 0.4],
        outline: {
          color: [255, 140, 0],
          width: 1.5
        }
      }
    },
    popupEnabled: false,
    outFields: ["*"]
  });

  // Community Forests Layer
  const communityForestsLayer = new GeoJSONLayer({
    url: "./data/community_forests.geojson",
    title: "Community Forests",
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [100, 180, 50, 0.7],
        outline: {
          color: [50, 120, 20],
          width: 1.5
        }
      }
    },
    popupEnabled: false,
    outFields: ["*"],
    visible: true
  });

  // Dzongkhag (District) Layer
  const dzongkhagLayer = new GeoJSONLayer({
    url: "./data/dzongkhag.geojson",
    title: "Dzongkhag (Districts)",
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: {
          color: [100, 100, 100],
          width: 1.5
        }
      }
    },
    popupEnabled: false,
    outFields: ["*"]
  });

  // Gewog (Subdistrict) Layer
  const gewogLayer = new GeoJSONLayer({
    url: "./data/gewog.geojson",
    title: "Gewog (Subdistricts)",
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: {
          color: [150, 150, 150],
          width: 0.8,
          style: "dash"
        }
      }
    },
    popupEnabled: false,
    visible: false,
    outFields: ["*"]
  });

  // Bhutan Boundary Layer
  const bhutanBoundaryLayer = new GeoJSONLayer({
    url: "./data/bhutan_boundary.geojson",
    title: "Bhutan National Boundary",
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: {
          color: [0, 0, 0],
          width: 2
        }
      }
    },
    popupEnabled: false,
    outFields: ["*"]
  });

  // Create map with all layers
  const map = new Map({
    basemap: "topo-vector",
    layers: [
      bhutanBoundaryLayer,
      dzongkhagLayer,
      gewogLayer,
      nationalParksLayer,
      corridorsLayer,
      communityForestsLayer
    ]
  });

  // Initialize view
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [90.4, 27.5],
    zoom: 8
  });

  // Configure Layer List widget
  const layerList = new LayerList({
    view: view,
    listItemCreatedFunction: function(event) {
      const item = event.item;
      if (item.layer.type !== "group") {
        item.panel = {
          content: "legend",
          open: false
        };
        item.actionsSections = [
          [
            {
              title: "Opacity",
              className: "esri-icon-sliders-horizontal",
              id: "opacity-slider"
            }
          ]
        ];
      }
    }
  });

  // Add Layer List to sidebar container
  layerList.container = "layerListContainer";

  // Add Search widget
  const search = new Search({ view });
  
  // Add Basemap Toggle widget
  const basemapToggle = new BasemapToggle({
    view: view,
    nextBasemap: "hybrid"
  });
  
  // Add Measurement widget (for area)
  const measurement = new Measurement({ view });

  // Add Geolocation widget
  const locate = new Locate({
    view: view,
    useHeadingEnabled: false,
    goToOverride: function(view, options) {
      options.target.scale = 1500; // Override default zoom level
      return view.goTo(options.target);
    }
  });

  // Create Expand widget for measurement
  const measurementExpand = new Expand({
    view: view,
    content: measurement,
    expandIconClass: "esri-icon-measure",
    expandTooltip: "Measurement Tools",
    expanded: false
  });

  // Add widgets to UI
  view.ui.add(search, "top-right");
  view.ui.add(basemapToggle, "bottom-right");
  view.ui.add(locate, "top-left");
  view.ui.add(measurementExpand, "top-right");

  // Zoom to Bhutan boundary when loaded
  bhutanBoundaryLayer.when(() => {
    view.goTo(bhutanBoundaryLayer.fullExtent);
    calculateStatistics();
  });

  // Get dashboard elements
  const dashboard = document.getElementById("dashboard");
  const closeBtn = document.getElementById("closeDashboard");

  // Click event handler for features
  view.on("click", function(event) {
    view.hitTest(event).then(function(response) {
      const results = response.results.filter(result => {
        return result.graphic && result.graphic.layer && 
               result.graphic.layer !== bhutanBoundaryLayer;
      });
      
      if (results.length > 0) {
        displayFeatureInfo(results[0].graphic);
        showDashboard();
      } else {
        hideDashboard();
      }
    });
  });

  // Close dashboard when clicking on the map background
  view.on("double-click", hideDashboard);
  
  // Close dashboard when pressing Escape key
  view.on("key-down", function(event) {
    if (event.key === "Escape") {
      hideDashboard();
    }
  });

  // Close dashboard button
  closeBtn.addEventListener("click", hideDashboard);

  // Function to show dashboard
  function showDashboard() {
    dashboard.classList.remove("hidden");
  }

  // Function to hide dashboard
  function hideDashboard() {
    dashboard.classList.add("hidden");
    clearHighlight();
    resetFeatureInfo();
  }

  // Function to display feature information in dashboard
  function displayFeatureInfo(graphic) {
    const featureInfo = document.getElementById("featureInfo");
    const attributes = graphic.attributes;
    const layerTitle = graphic.layer.title;
    
    // Filter out internal fields and empty values
    const displayAttributes = Object.entries(attributes).filter(([key, value]) => {
      return !['OBJECTID', 'FID', 'Shape__Area', 'Shape__Length'].includes(key) && 
             value !== null && value !== undefined && value !== '';
    });
    
    // Sort attributes alphabetically
    displayAttributes.sort((a, b) => a[0].localeCompare(b[0]));
    
    let content = `
      <div class="feature-card">
        <h3>${layerTitle}</h3>
        <div class="attributes-container">
    `;
    
    // Create attribute rows for all valid attributes
    displayAttributes.forEach(([key, value]) => {
      content += `
        <div class="attribute-row">
          <div class="attribute-label">${formatLabel(key)}:</div>
          <div class="attribute-value">${formatValue(value, key)}</div>
        </div>
      `;
    });
    
    content += `
        </div>
      </div>
    `;
    
    featureInfo.innerHTML = content;
    
    // Highlight the selected feature
    highlightFeature(graphic);
  }

  // Format attribute labels
  function formatLabel(label) {
    return label
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Km2', 'km²')
      .replace('Ha', 'hectares');
  }

  // Format attribute values
  function formatValue(value, key) {
    if (value === null || value === undefined) return 'N/A';
    
    if (typeof value === 'number') {
      // Format area values
      if (key.toLowerCase().includes('area') || key.toLowerCase().includes('km2')) {
        return value.toLocaleString() + ' km²';
      }
      if (key.toLowerCase().includes('ha') || key.toLowerCase().includes('hectare')) {
        return value.toLocaleString() + ' hectares';
      }
      return value.toLocaleString();
    }
    
    if (typeof value === 'string') {
      // Capitalize first letter of each word
      return value.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    return value;
  }

  // Highlight the selected feature
  function highlightFeature(graphic) {
    // Clear previous highlights
    clearHighlight();
    
    // Add highlight graphic
    const highlightGraphic = new Graphic({
      geometry: graphic.geometry,
      symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: {
          color: [255, 0, 0],
          width: 2
        }
      }
    });
    view.graphics.add(highlightGraphic);
  }

  // Clear highlight
  function clearHighlight() {
    view.graphics.removeAll();
  }

  // Reset feature info to empty state
  function resetFeatureInfo() {
    document.getElementById("featureInfo").innerHTML = `
      <div class="empty-state">
        <i class="fas fa-info-circle"></i>
        <p>Click on any feature to view details</p>
      </div>
    `;
  }

  // Calculate initial statistics
  function calculateStatistics() {
    // Query features from each layer to get accurate counts
    const promises = [
      nationalParksLayer.queryFeatureCount(),
      corridorsLayer.queryFeatureCount(),
      communityForestsLayer.queryFeatureCount()
    ];

    Promise.all(promises).then(results => {
      statistics.totalParks = results[0];
      statistics.totalCorridors = results[1];
      statistics.totalForests = results[2];
      
      // Get Bhutan's total area from the boundary layer
      bhutanBoundaryLayer.queryFeatures().then(({ features }) => {
        if (features.length > 0) {
          // Assuming the area is stored in an attribute or can be calculated
          const area = features[0].attributes.area || features[0].attributes.AREA || 
                       features[0].attributes.Shape__Area || 38394; // Fallback to example value
          statistics.totalArea = Math.round(area / 1000000); // Convert to km² if in m²
        }
        updateStatisticsPanel();
      });
    }).catch(error => {
      console.error("Error calculating statistics:", error);
      // Fallback to example values
      statistics.totalParks = 4;
      statistics.totalCorridors = 6;
      statistics.totalForests = 12;
      statistics.totalArea = 38394;
      updateStatisticsPanel();
    });
  }

  // Update statistics panel
  function updateStatisticsPanel() {
    const statsGrid = document.querySelector(".stats-grid");
    statsGrid.innerHTML = `
      <div class="stat-item">
        <div class="stat-label">National Parks</div>
        <div class="stat-value">${statistics.totalParks}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Biological Corridors</div>
        <div class="stat-value">${statistics.totalCorridors}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Community Forests</div>
        <div class="stat-value">${statistics.totalForests}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Total Area</div>
        <div class="stat-value">${statistics.totalArea.toLocaleString()} km²</div>
      </div>
    `;
  }
});