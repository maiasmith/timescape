HTMLWidgets.widget({

  name: 'timesweep',

  type: 'output',

  initialize: function(el, width, height) {
    

    // defaults
    var defaults = {
        padding: 15,
        legendWidth: 100,
        treeHeight: 100,
        treeWidth: 100,
        xAxisTitleDIVHeight: 45, // height of the x axis title DIV
        yAxisTitleDIVHeight: 45, // height of the y axis title DIV
        smallMargin: 5,
        widgetMargin: 10, // marging between widgets
        transitionSpeed: 200,
        isPopOverVisible: false,
        button: false,
        gridsterBaseDimension: 120,
        switchView: true,
        panel_width: 30,
        fontSize: 11,
        circleR: 20,
        rootColour: '#DDDADA',
        threshold: 0.005, // cellular prevalence threshold of visual detection
        legendGtypeHeight: 13, // height for each genotype in the legend
        patientTabWidth: 40,
        backgroundColour: "#EEEEEE" // colour for widget background
    };

    // global variable vizObj
    vizObj = {};
    vizObj.data = {};
    vizObj.view = {};

    // set configurations
    var config = $.extend(true, {}, defaults);
    vizObj.generalConfig = config;
    var dim = vizObj.generalConfig;

    dim.width = width - dim.yAxisTitleDIVHeight - 30;
    dim.height = height - dim.xAxisTitleDIVHeight - 30;

    return {}
    
  },

  renderValue: function(el, x, instance) {

    var dim = vizObj.generalConfig;


    // PARAMETERS

    // get params from R
    vizObj.userConfig = x;
    if (typeof(vizObj.userConfig.patient_ids) == "string") { // only one patient
        vizObj.userConfig.patient_ids = [vizObj.userConfig.patient_ids];
    }
    var numPatients = vizObj.userConfig.patient_ids.length; 

    // set parameters for grids
    dim.canvasSVGWidth = dim.width - dim.padding*2;
    dim.canvasSVGHeight = ((dim.height/numPatients) <= 200) ? // minimum height is 200px
        200 :
        (dim.height/numPatients) - (10 * (numPatients+1)) - dim.padding*2;
    dim.tsSVGHeight = dim.canvasSVGHeight;
    dim.tsSVGWidth = dim.canvasSVGWidth - dim.padding - dim.legendWidth - dim.treeWidth - dim.patientTabWidth;
    dim.xAxisWidth = dim.tsSVGWidth;
    dim.gridCellHeight = dim.canvasSVGHeight + dim.padding*2;
    dim.gridCellWidth = dim.canvasSVGWidth + dim.padding*2;
    dim.gridHeight = dim.gridCellHeight*numPatients + dim.widgetMargin*2*(numPatients-1); 


    // SET UP VIEW
    var view_id = el.id;
    vizObj.view_id = view_id;

    // CONTAINER DIV
    var containerDIV = d3.select(el)
        .append("div")
        .attr("class", "containerDIV")
        .style("position", "relative")
        .style("width", dim.width)
        .style("height", dim.height);


    // STATIC DIVS

    var xAxisTitleDIV = containerDIV.append("div")
        .attr("class", "xAxisTitleDIV")
        .style("height", dim.xAxisTitleDIVHeight + "px")
        .style("width", (dim.padding*2 + dim.xAxisWidth) + "px");

    var xAxisTitleSVG = xAxisTitleDIV.append("svg:svg")
        .attr("height", dim.xAxisTitleDIVHeight)
        .attr("width", dim.gridCellWidth);

    // plot x-axis title
    xAxisTitleSVG.append('text')
        .attr('class', 'axisTitle xAxis')
        .attr('x', dim.padding + dim.xAxisWidth/2)
        .attr('y', dim.xAxisTitleDIVHeight)
        .text(function() { 
            return x.xaxis_title;
        });

    var yAxisTitleDIV = containerDIV.append("div")
        .attr("class", "yAxisTitleDIV")
        .style("height", dim.gridHeight + "px");

    var yAxisTitleSVG = yAxisTitleDIV.append("svg:svg")
        .attr("height", dim.gridHeight)
        .attr("width", dim.xAxisTitleDIVHeight);

    // plot y-axis title
    yAxisTitleSVG.append('text')
        .attr('class', 'axisTitle yAxis')
        .attr('x', 0)
        .attr('y', 0)
        .attr('transform', "translate(" + (dim.yAxisTitleDIVHeight) + ", " + (dim.gridHeight/2) + ") rotate(-90)")
        .text(function() { 
            return x.yaxis_title;
        });


    // GRIDSTER

    var gridster_ul = containerDIV.append("div") // unordered list
        .attr("class", "gridster")
        .style("float", "left")
        .style("height", dim.gridHeight + "px")
        .style("width", dim.gridCellWidth + "px")
        .append("ul")    
        .style("float", "left"); 

    gridster_ul.selectAll("li")
        .data(vizObj.userConfig.patient_ids)
        .enter().append("li")
        .attr("class", function(d) { return "grid_" + d; })
        .attr("data-row", function(d,i) { return "" + (i+1); })
        .attr("data-col", "1")
        .attr("data-sizex", "1")
        .attr("data-sizey", "1");

    // initialize grid
    $(".gridster ul").gridster({
        widget_margins: [dim.widgetMargin, dim.widgetMargin],
        widget_base_dimensions: [dim.gridCellWidth, 
                                 dim.gridCellHeight],
        max_cols: 1
    });

    var gridster = $(".gridster ul").gridster().data('gridster');


    // GET MAX TIME SPAN

    // var max_timespan_sum = _getMaxTimespanSum(vizObj);

    // SET UP PAGE LAYOUT FOR EACH PATIENT
    vizObj.userConfig.patient_ids.forEach(function(patient_id, patient_idx) {

        vizObj.patient_id = patient_id;
        vizObj.view[patient_id] = {};
        vizObj.data[patient_id] = {};
        var patient_view = d3.select("#" + view_id).select(".grid_" + patient_id);

        var gridSVG = gridster_ul.select(".grid_" + patient_id)
            .append("svg:svg")
            .attr("class", "gridSVG")
            .attr("x", 0)
            .attr("y", 0) 
            .attr("width", dim.gridCellWidth) 
            .attr("height", dim.gridCellHeight);

        var canvasSVG = gridSVG.append("g")
            .attr("class", "canvasSVG")
            .attr("transform", "translate(" + dim.padding + "," + dim.padding + ")");

        var tsSVG = canvasSVG.append("g")  
            .attr("class", "tsSVG");

        var yAxisSVG = canvasSVG.append("g") 
            .attr("class", "yAxisSVG")      
            .attr("transform", "translate(" + 0 + "," + 0 + ")");

        var xAxisSVG = gridSVG.append("g") 
            .attr("class", "xAxisSVG")
            .attr("transform", "translate(" + dim.padding + ",0)");

        var tsLegendSVG = canvasSVG.append("g") 
            .attr("class", "tsLegendSVG")
            .attr("transform", "translate(" + (dim.tsSVGWidth + dim.padding) + ",0)");

        var tsTree = canvasSVG.append("g") 
            .attr("class", "tsTreeSVG")
            .attr("transform", "translate(" + 
            (dim.tsSVGWidth + dim.padding + dim.legendWidth) + ",0)");

        // move the switch SVG down by the height of the legend + height of the tree
        var tsSwitch = canvasSVG.append("g") 
            .attr("class", "tsSwitchSVG")
            .attr("transform", "translate(" + (dim.tsSVGWidth + dim.padding) + "," + (dim.tsSVGHeight - 25) + ")");

        vizObj.view[patient_id].gridSVG = gridSVG;
        vizObj.view[patient_id].canvasSVG = canvasSVG;
        vizObj.view[patient_id].xAxisSVG = xAxisSVG;
        vizObj.view[patient_id].yAxisSVG = yAxisSVG;
        vizObj.view[patient_id].tsSVG = tsSVG;
        vizObj.view[patient_id].tsLegendSVG = tsLegendSVG;
        vizObj.view[patient_id].tsTree = tsTree;
        vizObj.view[patient_id].tsSwitch = tsSwitch;


        // CREATE PATIENT TAB

        var patientTabG = vizObj.view[patient_id].gridSVG
            .append("g")
            .attr("class", "patientTabG");

        // tab rectangle
        var spaceBeforePatientTab = dim.padding + dim.tsSVGWidth + dim.padding + dim.legendWidth 
            + dim.treeWidth + dim.padding;
        patientTabG.append("rect")
            .attr("width", dim.patientTabWidth)
            .attr("height", dim.gridCellHeight)
            .attr("x", spaceBeforePatientTab)
            .attr("y", 0)
            .attr("fill", "#ABAAAA")
            .attr("stroke", "white")
            .attr("stroke-width", 5);

        // tab text
        patientTabG.append("text")
            .attr("class", "patientTabText")
            .attr("dy", "0.35em")
            .attr("transform", "translate(" 
                + (spaceBeforePatientTab + dim.patientTabWidth/2) + "," 
                + dim.gridCellHeight/2 + ") rotate(-90)")
            .attr("fill", "white")
            .text(patient_id);


        // GET CONTENT

        // extract all info from tree about nodes, edges, ancestors, descendants
        _getTreeInfo(vizObj);

        // get timepoints, prepend a "T0" timepoint to represent the timepoint before any data originated
        var cur_clonal_prev = _.filter(vizObj.userConfig.clonal_prev, function(prev){ // CP data for this patient
            return prev.patient_name == patient_id; 
        });
        var timepoints = _.uniq(_.pluck(cur_clonal_prev, "timepoint"));
        timepoints.unshift("T0");
        vizObj.data[patient_id].timepoints = timepoints;

        // get cellular prevalence info
        _getCPData(vizObj);

        // get emergence values for each genotype
        vizObj.data[patient_id].emergence_values = _getEmergenceValues(vizObj);

        // convert time-centric cellular prevalence data into genotype-centric cellular prevalence data
        _getGenotypeCPData(vizObj);

        // get the layout of the traditional timesweep
        _getLayout(vizObj);

        // get paths for plotting
        _getPaths(vizObj);

        // get cellular prevalence labels
        vizObj.data[patient_id].ts_trad_labels = _getTraditionalCPLabels(vizObj);
        vizObj.data[patient_id].ts_sep_labels = _getSeparateCPLabels(vizObj);


        // SET CONTENT

        // get colour scheme
        _getColours(vizObj);
        var colour_assignment = vizObj.view[patient_id].colour_assignment,
            alpha_colour_assignment = vizObj.view[patient_id].alpha_colour_assignment,
            greyscale_assignment = vizObj.view[patient_id].greyscale_assignment,
            alpha_greyscale_assignment = vizObj.view[patient_id].alpha_greyscale_assignment;

        // plot timesweep data
        vizObj.view[patient_id].tsSVG
            .selectAll('.tsPlot')
            .data(vizObj.data[patient_id].all_bezier_paths, function(d) {
                d.col = colour_assignment[d.gtype];
                d.alpha_col = alpha_colour_assignment[d.gtype];
                d.grey = greyscale_assignment[d.gtype];
                d.alpha_grey = alpha_greyscale_assignment[d.gtype];
                d.show_root = vizObj.userConfig.show_root;
                d.root_colour = dim.rootColour;
                d.alpha = vizObj.userConfig.alpha;
                return d.gtype;
            })
            .enter().append('path')
            .attr('class', 'tsPlot')
            .attr('d', function(d) { return d.traditional_path; })
            .attr('fill', function(d) { 
                return d.alpha_col;
            }) 
            .attr('stroke', function(d) { 
                return d.col; 
            })
            .attr('fill-opacity', function(d) {
                return (d.gtype == "Root" && !vizObj.userConfig.show_root) ? 0 : 1;
            })
            .attr('stroke-opacity', function(d) {
                return (d.gtype == "Root" && !vizObj.userConfig.show_root) ? 0 : 1;
            })
            .on('mouseover', function(d) {
                return _gtypeMouseover(patient_view, d.gtype);
            })
            .on('mouseout', function(d) {
                return _gtypeMouseout(patient_view, d.gtype);
            });

        // plot time point guides
        vizObj.view[patient_id].tsSVG
            .selectAll('.tpGuide')
            .data(vizObj.data[patient_id].timepoints)
            .enter().append('line')
            .attr('class', function(d) { return 'tpGuide tp_' + d; })
            .attr('x1', function(d, i) { return (i / (vizObj.data[patient_id].timepoints.length - 1)) * dim.tsSVGWidth; })
            .attr('x2', function(d, i) { return (i / (vizObj.data[patient_id].timepoints.length - 1)) * dim.tsSVGWidth; })
            .attr('y1', 0)
            .attr('y2', dim.tsSVGHeight)
            .attr('stroke', 'grey')
            .attr('stroke-opacity', '0')
            .attr('stroke-width', '1.5px')
            .style('pointer-events', 'none');

        // plot cellular prevalence labels at each time point - traditional timesweep view 
        var labels = vizObj.data[patient_id].ts_trad_labels.concat(vizObj.data[patient_id].ts_sep_labels);

        var labelG = vizObj.view[patient_id].tsSVG
            .selectAll('.gLabel')
            .data(labels)
            .enter().append('g')
            .attr('class', 'gLabel');

        labelG
            .append('circle')
            .attr('class', function(d) { 
                if (d.type == "traditional") {
                    return 'labelCirc tp_' + d.tp + ' gtype_' + d.gtype; 
                }
                return 'sepLabelCirc tp_' + d.tp + ' gtype_' + d.gtype; 
            }) 
            .attr('cx', function(d) { 

                // index of this time point relative to others
                var index = vizObj.data[patient_id].timepoints.indexOf(d.tp); 

                var x_val = (index / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth);

                // if the time point is the last
                if (index == vizObj.data[patient_id].timepoints.length - 1) {
                    // shift it to the left
                    x_val -= dim.circleR;
                }

                return x_val; 
            })
            .attr('cy', function(d) { 
                // if the label, when centered vertically...
                // ... is cut off at the top, shift down
                if ((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) < dim.circleR) {
                    return 1 + dim.circleR;
                }

                // ... is cut off at the bottom, shift up
                else if ((d.middle*dim.tsSVGHeight) < dim.circleR) {
                    return dim.tsSVGHeight - 1 - dim.circleR;
                }

                // ... is not cut off, center vertically
                return (1 - d.middle)*dim.tsSVGHeight; 
            })
            .attr('r', dim.circleR)
            .attr('fill', 'white')
            .attr('fill-opacity', 0)
            .style('pointer-events', 'none');

        labelG
            .append('text')
            .attr('font-family', 'sans-serif')
            .attr('font-size', dim.fontSize)
            .attr('class', function(d) { 
                if (d.type == "traditional") {
                    return 'label tp_' + d.tp + ' gtype_' + d.gtype; 
                }
                return 'sepLabel tp_' + d.tp + ' gtype_' + d.gtype; 
            }) 
            .text(function(d) {
                var cp = (Math.round(d.cp * 100) / 1);
                if (cp == 0) {
                    return "< 1";
                }
                return cp.toString();
            })
            .attr('x', function(d) { 

                // index of this time point relative to others
                var index = vizObj.data[patient_id].timepoints.indexOf(d.tp); 

                var x_val = (index / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth);

                // if the time point is the last
                if (index == vizObj.data[patient_id].timepoints.length - 1) {
                    // shift it to the left
                    x_val -= dim.circleR;
                }

                return x_val; 
            })
            .attr('y', function(d) { return (1 - d.middle)*dim.tsSVGHeight; })
            .attr('dy', function(d) {

                // if the label, when centered vertically...
                // ... is cut off at the top, shift down
                if ((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) < dim.circleR) {
                    d3.select(this).attr('y', 1 + dim.circleR);
                }

                // ... is cut off at the bottom, shift up
                else if ((d.middle*dim.tsSVGHeight) < dim.circleR) {
                    d3.select(this).attr('y', dim.tsSVGHeight - 1 - dim.circleR);
                }

                // ... is not cut off, center vertically
                return '.35em';
            })
            .attr('fill', 'black')
            .attr('opacity', 0)
            .attr('text-anchor', 'middle')
            .style('pointer-events', 'none');


        // PLOT PERTURBATIONS INFO

        // user specified perturbations in the time-series data
        var perturbations = _.filter(vizObj.userConfig.perturbations, function(perts){  
            return perts.patient_name == vizObj.patient_id; 
        });

        // plot labels
        vizObj.view[patient_id].xAxisSVG
            .selectAll('.pertLabel')
            .data(perturbations)
            .enter().append('text')
            .attr('class', 'pertLabel')
            .attr('x', function(d) { 
                var prevTP_idx = vizObj.data[patient_id].timepoints.indexOf(d.prev_tp);
                return ((prevTP_idx + 0.5) / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth); 
            })
            .attr('y', dim.padding - dim.smallMargin)
            .text(function(d) { return d.pert_name; })
            .on('mouseover', function(d) {
                vizObj.view[patient_id].tsSVG.selectAll(".pertGuide.pert_" + d.pert_name).attr('stroke-opacity', 1); 
            })
            .on('mouseout', function(d) {
                vizObj.view[patient_id].tsSVG.selectAll(".pertGuide.pert_" + d.pert_name).attr('stroke-opacity', 0);
            });

        // plot guides
        vizObj.view[patient_id].tsSVG
            .selectAll('.pertGuide')
            .data(perturbations)
            .enter().append('line')
            .attr('class', function(d) { return 'pertGuide pert_' + d.pert_name; })
            .attr('x1', function(d) { 
                var prevTP_idx = vizObj.data[patient_id].timepoints.indexOf(d.prev_tp);
                return ((prevTP_idx + 0.5) / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth); 
            })
            .attr('x2', function(d) { 
                var prevTP_idx = vizObj.data[patient_id].timepoints.indexOf(d.prev_tp);
                return ((prevTP_idx + 0.5) / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth); 
            })
            .attr('y1', 0)
            .attr('y2', dim.tsSVGHeight)
            .attr('stroke', 'grey')
            .attr('stroke-opacity', '0')
            .attr('stroke-width', '1.5px')
            .style('pointer-events', 'none');


        // PLOT X-AXIS

        // plot x-axis labels
        vizObj.view[patient_id].xAxisSVG
            .selectAll('.xAxisLabels')
            .data(vizObj.data[patient_id].timepoints)
            .enter().append('text')
            .attr('class', 'xAxisLabels')
            .attr('x', function(d, i) { 
                return (i / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth); 
            })
            .attr('y', dim.padding - dim.smallMargin)
            .text(function(d) { return d; })
            .on('mouseover', function(d) {
                vizObj.view[patient_id].tsSVG.selectAll(".tpGuide.tp_" + d).attr('stroke-opacity', 1); 
                
            })
            .on('mouseout', function(d) {
                vizObj.view[patient_id].tsSVG.selectAll(".tpGuide.tp_" + d).attr('stroke-opacity', 0);
            });      
        


        // PLOT LEGEND

        // plot legend rectangles
        vizObj.view[patient_id].tsLegendSVG
            .selectAll('.legendRect')
            .data(vizObj.data[patient_id].treeNodes)
            .enter().append('rect')
            .attr('class', 'legendRect')
            .attr('x', 0)
            .attr('y', function(d, i) { return i*dim.legendGtypeHeight + 25; }) // 25 for legend title
            .attr('height', 10)
            .attr('width', 10)
            .attr('fill', function(d) { return alpha_colour_assignment[d]; })
            .attr('stroke', function(d) { return colour_assignment[d]; })
            .on('mouseover', function(d) {
                return _gtypeMouseover(patient_view, d);
            })
            .on('mouseout', function(d) {
                return _gtypeMouseout(patient_view, d);
            });

        // plot legend text
        vizObj.view[patient_id].tsLegendSVG
            .selectAll('.legendText')
            .data(vizObj.data[patient_id].treeNodes)
            .enter().append('text')
            .attr('class', 'legendText')
            .attr('x', 20)
            // 25 for legend title, 5 for centring w/resp. to rectangle
            .attr('y', function(d, i) { return (i*dim.legendGtypeHeight) + 5 + 25; }) 
            .attr('dy', '.35em')
            .attr('font-size', '11px')
            .attr('font-family', 'sans-serif')
            .style('text-anchor', 'left')
            .text(function(d) { return d; });

        // plot legend title
        vizObj.view[patient_id].tsLegendSVG
            .append('text')
            .attr('class', 'legendTitle')
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '.71em')
            .text('Genotype');


        // PLOT TREE GLYPH

        // plot tree title
        var treeTitle = vizObj.view[patient_id].tsTree
            .append('text')
            .attr('class', 'treeTitle')
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '.71em')
            .text('Tree'); 

        // d3 tree layout
        var treePadding = 10,
            treeTitleHeight = treeTitle.node().getBBox().height,
            treeLayout = d3.layout.tree()           
                .size([dim.treeHeight - treePadding - treeTitleHeight, dim.treeWidth - treePadding]); 

        // get nodes and links
        var root = $.extend({}, vizObj.data[patient_id].treeStructure), // copy tree into new variable
            nodes = treeLayout.nodes(root), 
            links = treeLayout.links(nodes);   
     
        // swap x and y direction
        nodes.forEach(function(node) {
            node.tmp = node.y;
            node.y = node.x + (treePadding/2) + treeTitleHeight;
            node.x = node.tmp + (treePadding/2);
            delete node.tmp;
        });

        // create links
        var link = vizObj.view[patient_id].tsTree.append("g")
            .classed("treeLinks", true)
            .selectAll(".treeLink")                  
            .data(links)                   
            .enter().append("path")                   
            .attr("class","treeLink")
            .attr('stroke', 'black')
            .attr('fill', 'none')                
            .attr("d", _elbow); 

        // create nodes
        var node = vizObj.view[patient_id].tsTree.selectAll(".treeNode")                  
            .data(nodes)                   
            .enter()
            .append("circle")     
            .attr("cx", function(d) { return d.x})
            .attr("cy", function(d) { return d.y})              
            .classed("treeNode", true) 
            .attr("fill", function(d) {
                return alpha_colour_assignment[d.id];
            })
            .attr('stroke', function(d) {
                return colour_assignment[d.id];
            })
            .attr("id", function(d) { return d.sc_id; })
            .attr("r", 4)
            .on('mouseover', function(d) {
                return _gtypeMouseover(patient_view, d.id);
            })
            .on('mouseout', function(d) {
                return _gtypeMouseout(patient_view, d.id);
            });

        // SWITCH between traditional and tracks views

        // checkbox
        vizObj.view[patient_id].tsSwitch
            .append("foreignObject")
            .attr('x', -10)
            .attr('y', 0)
            .attr('width', 50)
            .attr('height', 20)
            .append("xhtml:body")
            .html("<input type=\"checkbox\" id=\"true\">");

        // checkbox text
        vizObj.view[patient_id].tsSwitch
            .append("text")
            .attr("class", "switchTitle")
            .attr('x', 17)
            .attr('y', 15)
            .text("Clonal Trajectory")

        // when checkbox selected, change view
        vizObj.view[patient_id].tsSwitch.select("input").on("change", function() {
            _switchView(patient_view, this);
        });

    })

  },

  resize: function(el, width, height, instance) {
   
    return {}
    
  }

});
