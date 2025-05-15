function createBubbleChart(error, data, regionNames) {

    /*proj4.defs("EPSG:2154", "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 " +
        "+lon_0=3 +x_0=700000 +y_0=6600000 " +
        "+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

    data.forEach(d => {
        d.nb_lgt = +d.nb_lgt;
        
        // Convertir les coordonnées EPSG:2154 vers WGS84 (si tes données sont en Lambert93)
        const [lon, lat] = proj4("EPSG:2154", "WGS84", [+d.xCentroid, +d.yCentroid]);
        d.lon = lon;
        d.lat = lat;
    });*/

    data.forEach(d => {
        d.nb_lgt = +d.nb_lgt;
        d.xCentroid = +d.xCentroid;
        d.yCentroid = +d.yCentroid;
      });

    var width = 1400,
    height = 800;
      
    var logements = data.map(function(dep) { return +dep.nb_lgt; });
    var meanLogements = d3.mean(logements),
        logementExtent = d3.extent(logements),
        populationScaleX,
        populationScaleY;

    var regions = d3.set(data.map(function(dep) { return dep.code_region; }));
    var regionColorScale = d3.scaleOrdinal(d3.schemeCategory20)
        .domain(regions.values());
    const regionCodes = regions.values(); // Ex : ["84", "11", "28", ...]
    const regionScaleX = d3.scaleBand()
        .domain(regionCodes)
        .range([100, width - 100])
        .padding(0.2); // espace entre les groupes
    

    var svg,
        g,
        circles,
        circleSize = { min: 10, max: 80 };
    var circleRadiusScale = d3.scaleSqrt()
    .domain(logementExtent)
    .range([circleSize.min, circleSize.max]);

    var forces,
        forceSimulation;

    createSVG();
    toggleRegionKey(true);
    createCircles();
    createForces();
    createForceSimulation();
    addFillListener();
    addGroupingListeners();
    

    function createSVG() {
        svg = d3.select("#bubble-chart")
          .append("svg")
          .attr("preserveAspectRatio", "xMidYMid meet")
          .attr("viewBox", `0 0 ${width} ${height}`)
          .classed("svg-content", true);
      
        // Groupe principal
        g = svg.append("g");
      
        // Info texte SVG en haut à gauche
        infoText = svg.append("text")
          .attr("x", 20)
          .attr("y", 30)
          .attr("class", "svg-info-text")
          .style("font-size", "16px")
          .style("font-weight", "500")
          .style("fill", "#333")
          .style("pointer-events", "none")
          .style("user-select", "none");
    }
      

    
  
    function toggleRegionKey(showRegionKey) {
        var keyElementWidth = 150,
            keyElementHeight = 30;
        var onScreenYOffset = keyElementHeight * 1.5,
            offScreenYOffset = 100;
        
        if (d3.select(".region-key").empty()) {
            createRegionKey();
        }
        var regionKey = d3.select(".region-key");
        
        if (showRegionKey) {
            translateRegionKey("translate(0," + (height - onScreenYOffset) + ")");
        } else {
            translateRegionKey("translate(0," + (height + offScreenYOffset) + ")");
        }
        
        function createRegionKey() {
            const container = d3.select("#region-legend");
            container.html(""); // vide le contenu si déjà généré
          
            const regionList = regions.values();
          
            regionList.forEach(code => {
              const color = regionColorScale(code);
              const name = regionNames[code] || code;
          
              const item = container.append("div")
                .attr("class", "legend-item");
          
              item.append("div")
                .attr("class", "legend-color")
                .style("background-color", color);
          
              item.append("span").text(name);
            });
        }
        
        function translateRegionKey(translation) {
            regionKey
            .transition()
            .duration(500)
            .attr("transform", translation);
        }
    }
      
    
    function isChecked(elementID) {
      return d3.select(elementID).property("checked");
    }

    function createCircles() {
    var formatNombre = d3.format(",");
    
    // ✅ Trie les départements du plus grand au plus petit nb_lgt
    data.sort((a, b) => b.nb_lgt - a.nb_lgt);
    
    circles = g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", function(d) { return circleRadiusScale(d.nb_lgt/2); })
        .on("mouseover", function(d) {
        updateDepInfo(d);
        })
        .on("mouseout", function() {
        updateDepInfo();
        });
    
    updateCircles();
    
    function updateDepInfo(dep) {
        if (dep) {
            infoText.html(null); // Réinitialise

            infoText
              .append("tspan")
              .attr("x", 20)
              .attr("dy", "0em")
              .text(`${dep.nom_dep} (${dep.code_dep})`);
            
            infoText
              .append("tspan")
              .attr("x", 20)
              .attr("dy", "1.2em")
              .text(`Nombre de logements sociaux : ${d3.format(",")(dep.nb_lgt)}`);
        } else {
          infoText.text("");
        }
    }
    }
      
      
      
    function updateCircles() {
    circles
        .attr("fill", function(d) {
        return regionColorScale(d.code_region);
        });
    }

      
  
    function createForces() {
        var forceStrength = 0.05;
    
        forces = {
            combine:        createCombineForces(),
            depCenters:    createDepCenterForces(),
            regions:        createRegionForces(),
            logement:       createLogementForces()
        };
    
        function createCombineForces() {
            return {
            x: d3.forceX(width / 2).strength(forceStrength),
            y: d3.forceY(height / 2).strength(forceStrength)
            };
        }
    
        function createDepCenterForces() {
            const projection = d3.geoConicConformal()
            .center([2.5, 46.5])         // centre France
            .scale(3500)                 // zoom à adapter (3000–4000 fonctionne bien)
            .translate([width / 2, height / 2]); // centre dans le SVG
        
            return {
            x: d3.forceX(d => {
                const coords = projection([+d.xCentroid, +d.yCentroid]);
                return coords ? coords[0] : width / 2;
            }).strength(0.5),
        
            y: d3.forceY(d => {
                const coords = projection([+d.xCentroid, +d.yCentroid]);
                return coords ? coords[1] : height / 2;
            }).strength(0.5)
            };
        }
        
        function createRegionForces() {
            return {
              x: d3.forceX(d => {
                const xPos = regionScaleX(d.code_region);
                return xPos != null ? xPos + regionScaleX.bandwidth() / 2 : width / 2;
              }).strength(0.6),
              
              y: d3.forceY(height / 2).strength(0.2)
            };
        }
        
        function createLogementForces() {
            var regionNamesDomain = regions.values().map(function(code) {
            return regionNames[code];
            });
            var scaledMargin = circleSize.max;
        
            populationScaleX = d3.scaleBand()
            .domain(regionNamesDomain)
            .range([scaledMargin, width - scaledMargin * 2]);
        
            populationScaleY = d3.scaleLog()
            .domain(logementExtent)
            .range([height - scaledMargin, scaledMargin * 2]);
        
            var offset = populationScaleX.bandwidth() / 2;
            return {
            x: d3.forceX(function(d) {
                return populationScaleX(regionNames[d.code_region]) + offset;
            }).strength(forceStrength),
            y: d3.forceY(function(d) {
                return populationScaleY(+d.nb_lgt);
            }).strength(forceStrength)
            };
        }
    }
      
    /*
    function createForceSimulation() {
        forceSimulation = d3.forceSimulation()
            .force("x", forces.combine.x)
            .force("y", forces.combine.y)
            .force("collide", d3.forceCollide(forceCollide));
    
        forceSimulation.nodes(data)
            .on("tick", function() {
                circles
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        });
    }*/
    function createForceSimulation() {
        forceSimulation = d3.forceSimulation(data)
          .force("x", forces.combine.x)
          .force("y", forces.combine.y)
          .force("collide", d3.forceCollide(forceCollide))
          .on("tick", () => {
            circles
              .attr("cx", d => d.x)
              .attr("cy", d => d.y);
          });
    }
    /*
    forceSimulation = d3.forceSimulation(data)
    .force("x", forces.combine.x)
    .force("y", forces.combine.y)
    .force("collide", d3.forceCollide(d => circleRadiusScale(d.nb_lgt) + 5))
    .on("tick", () => {
        circles
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });*/

    forceSimulation = d3.forceSimulation(data)
    .velocityDecay(0.4) // ← freine le mouvement plus vite
    .force("x", forces.combine.x)
    .force("y", forces.combine.y)
    .force("collide", d3.forceCollide(d => circleRadiusScale(d.nb_lgt) + 1))
    .alpha(1)              // pour forcer un départ
    .alphaDecay(0.03)      // ← accélère la stabilisation
    .on("tick", () => {
        circles
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

    
    function forceCollide(d) {
    return depCenterGrouping() || logementGrouping() ? 0 : circleRadiusScale(+d.nb_lgt/2) + 2;
    }
    
    function depCenterGrouping() {
    return isChecked("#dep-centers");
    }

    
    function logementGrouping() {
    return isChecked("#nbrLogement");
    }
      
  
    function addFillListener() {
        d3.selectAll('input[name="fill"]')
          .on("change", function() {
            toggleRegionKey(true); // toujours afficher la légende des régions
            updateCircles();       // recolore les cercles si jamais tu ajoutes d’autres options plus tard
        });
    }
      
  
    function addGroupingListeners() {
        addListener("#combine",        forces.combine);
        addListener("#dep-centers",   forces.depCenters);
        addListener("#regions",        forces.regions);
        addListener("#nbrLogement",    forces.logement);


        function addListener(selector, targetForces) {
          d3.select(selector).on("click", () => {
            updateForces(targetForces);
            toggleRegionKey(!logementGrouping());
            togglePopulationAxes(logementGrouping());
        });
        }
      
        /*
        function updateForces(forces) {
          forceSimulation
            .force("x", forces.x)
            .force("y", forces.y)
            .force("collide", d3.forceCollide(forceCollide))
            .alphaTarget(0.5)
            .restart();
        }

        function updateForces(newForces) {
            forceSimulation
              .force("x", newForces.x)
              .force("y", newForces.y)
              .force("collide", d3.forceCollide(forceCollide))
              .alphaTarget(0.7)
              .restart();
        }*/

        function updateForces(newForces) {
            forceSimulation
              .force("x", newForces.x)
              .force("y", newForces.y)
              .force("collide", d3.forceCollide(forceCollide))
              .alphaTarget(0.7)
              .alpha(1)
              .restart();
            if (newForces === forces.regions) {
                setTimeout(() => forceSimulation.stop(), 1000);
                console.log("stop forceSimulation");
            }
        }

      
  
        function togglePopulationAxes(showAxes) {
            var onScreenXOffset = 40,
                offScreenXOffset = -40;

          
            if (d3.select(".y-axis").empty()) {
              createAxes();
            }
          
            var yAxis = d3.select(".y-axis");
          
            if (showAxes) {
              translateAxis(yAxis, "translate(" + onScreenXOffset + ",0)");
            } else {
              translateAxis(yAxis, "translate(" + offScreenXOffset + ",0)");
            }
          
            function createAxes() {
              var numberOfTicks = 10,
                  tickFormat = ".0s";
          
              var yAxis = d3.axisLeft(populationScaleY)
                .ticks(numberOfTicks, tickFormat);
            svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", "translate(" + offScreenXOffset + ",0)")
            .call(yAxis)
            .selectAll(".tick text")
                .attr("font-size", "12px");
            }
          
            function translateAxis(axis, translation) {
              axis
                .transition()
                .duration(500)
                .attr("transform", translation);
            }
        }
    }
  }