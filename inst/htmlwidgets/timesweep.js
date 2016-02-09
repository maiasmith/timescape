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
        yAxisTitleDIVHeight: 30, // height of the y axis title DIV
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

    dim.width = width;
    dim.height = height;

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
    dim.gridHeight = dim.canvasSVGHeight + dim.padding*2;
    dim.gridWidth = dim.canvasSVGWidth + dim.padding*2;
    

    // SET UP BODY

    // grey background colour
    d3.select("body")
        .style("background-color", dim.backgroundColour);

    // CONTAINER DIV

    var containerDIV = d3.select(el)
        .append("div")
        .attr("class", "containerDIV")
        .style("width", dim.width)
        .style("height", dim.height);


    // STATIC DIVS

    var xAxisTitleDIV = d3.select(".containerDIV")
        .append("div")
        .attr("class", "xAxisTitleDIV")
        .style("height", dim.xAxisTitleDIVHeight);

    var xAxisTitleSVG = xAxisTitleDIV.append("svg:svg")
        .attr("height", dim.xAxisTitleDIVHeight)
        .attr("width", dim.width);

    // plot x-axis title
    xAxisTitleSVG.append("rect")
        .attr("x", dim.padding)
        .attr("y", 0)
        .attr("height", dim.xAxisTitleDIVHeight)
        .attr("width", dim.tsSVGWidth)
        .attr("fill", dim.backgroundColour)
        .attr("stroke", dim.backgroundColour);

    xAxisTitleSVG.append('text')
        .attr('class', 'axisTitle xAxis')
        .attr('x', dim.padding + dim.xAxisWidth/2)
        .attr('y', dim.xAxisTitleDIVHeight - dim.smallMargin)
        .text(function() { 
            return x.xaxis_title;
        });

    var yAxisTitleDIV = d3.select(".containerDIV")
        .append("div")
        .attr("class", "yAxisTitleDIV")
        .style("height", window.innerHeight);

    var yAxisTitleSVG = yAxisTitleDIV.append("svg:svg")
        .attr("height", window.innerHeight)
        .attr("width", dim.xAxisTitleDIVHeight);

    // plot y-axis title
    yAxisTitleSVG.append('text')
        .attr('class', 'axisTitle yAxis')
        .attr('x', 0)
        .attr('y', 0)
        .attr('transform', "translate(" + (dim.yAxisTitleDIVHeight) + ", " + 
            ((dim.gridHeight*numPatients + dim.widgetMargin*(numPatients-1))/2) + ") rotate(-90)")
        .text(function() { 
            return x.yaxis_title;
        });


    // GRIDSTER

    var gridster_ul = d3.select(".containerDIV") // unordered list
        .append("div")
        // .style("z-index", -1)
        .style("height", dim.height)
        .style("width", dim.width)
        .attr("class", "gridster")
        .append("ul")        
        .style("height", dim.height)
        .style("width", dim.width);

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
        widget_margins: [0, dim.widgetMargin],
        widget_base_dimensions: [dim.gridWidth, 
                                 dim.gridHeight],
        max_cols: 1
    });

    var gridster = $(".gridster ul").gridster().data('gridster');


    // SET UP PAGE LAYOUT FOR EACH PATIENT
    vizObj.userConfig.patient_ids.forEach(function(patient_id, patient_idx) {

        vizObj.patient_id = patient_id;
        vizObj.view[patient_id] = {};
        vizObj.data[patient_id] = {};

        var gridSVG = d3.select(".grid_" + patient_id)
            .append("svg:svg")
            .attr("class", "gridSVG_" + patient_id)
            .attr("x", 0)
            .attr("y", 0) 
            .attr("width", dim.gridWidth) 
            .attr("height", dim.gridHeight);

        var canvasSVG = d3.select(".gridSVG_" + patient_id) 
            .append("g")
            .attr("class", "canvasSVG_" + patient_id)
            .attr("transform", "translate(" + dim.padding + "," + 
                dim.padding + ")");

        var tsSVG = d3.select(".canvasSVG_" + patient_id)
            .append("g")  
            .attr("class", "tsSVG_" + patient_id);

        var yAxisSVG = d3.select(".canvasSVG_" + patient_id) 
            .append("g") 
            .attr("class", "yAxisSVG_" + patient_id)      
            .attr("transform", "translate(" + 0 + "," + 0 + ")");

        var xAxisSVG = d3.select(".gridSVG_" + patient_id) 
            .append("g") 
            .attr("class", "xAxisSVG_" + patient_id)
            .attr("transform", "translate(" + dim.padding + ",0)");

        var tsLegendSVG = d3.select(".canvasSVG_" + patient_id)
            .append("g") 
            .attr("class", "tsLegendSVG_" + patient_id)
            .attr("transform", "translate(" + (dim.tsSVGWidth + dim.padding) + ",0)");

        var tsTree = d3.select(".canvasSVG_" + patient_id)
            .append("g") 
            .attr("class", "tsTreeSVG_" + patient_id)
            .attr("transform", "translate(" + 
            (dim.tsSVGWidth + dim.padding + dim.legendWidth) + ",0)");

        // move the switch SVG down by the height of the legend + height of the tree
        var tsSwitch = d3.select(".canvasSVG_" + patient_id)
            .append("g") 
            .attr("class", "tsSwitchSVG_" + patient_id)
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
            .attr("height", dim.gridHeight)
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
                + dim.gridHeight/2 + ") rotate(-90)")
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
            alpha_colour_assignment = vizObj.view[patient_id].alpha_colour_assignment;

        // plot timesweep data
        var patientID_class = 'patientID_' + patient_id;
        vizObj.view[patient_id].tsSVG
            .selectAll('.tsPlot')
            .data(vizObj.data[patient_id].bezier_paths, function(d) {
                return d.gtype;
            })
            .enter().append('path')
            .attr('class', function() { return 'tsPlot ' + patientID_class; })
            .attr('d', function(d) { return d.path; })
            .attr('fill', function(d) { 
                return (x.alpha == "NA") ? colour_assignment[d.gtype] : alpha_colour_assignment[d.gtype];
            }) 
            .attr('stroke', function(d) { 
                return (d.gtype == "Root" && vizObj.userConfig.show_root) ? 
                    dim.rootColour : 
                    colour_assignment[d.gtype]; 
            })
            .attr('fill-opacity', function(d) {
                return (d.gtype == "Root" && !vizObj.userConfig.show_root) ? 0 : 1;
            })
            .attr('stroke-opacity', function(d) {
                return (d.gtype == "Root" && !vizObj.userConfig.show_root) ? 0 : 1;
            })
            .on('mouseover', function(d) {
                return _gtypeMouseover(vizObj, d.gtype, patient_id);
            })
            .on('mouseout', function(d) {
                return _gtypeMouseout(vizObj, d.gtype, patient_id)
            });

        // plot time point guides
        vizObj.view[patient_id].tsSVG
            .selectAll('.tpGuide')
            .data(vizObj.data[patient_id].timepoints)
            .enter().append('line')
            .attr('class', function(d) { return 'tpGuide tp_' + d + ' ' + patientID_class; })
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
                    return 'labelCirc tp_' + d.tp + ' gtype_' + d.gtype + ' ' + patientID_class; 
                }
                return 'sepLabelCirc tp_' + d.tp + ' gtype_' + d.gtype + ' ' + patientID_class; 
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
                    return 'label tp_' + d.tp + ' gtype_' + d.gtype + ' ' + patientID_class; 
                }
                return 'sepLabel tp_' + d.tp + ' gtype_' + d.gtype + ' ' + patientID_class; 
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

        // plot labels
        vizObj.view[patient_id].xAxisSVG
            .selectAll('.pertLabel')
            .data(vizObj.userConfig.perturbations)
            .enter().append('text')
            .attr('class', 'pertLabel')
            .attr('x', function(d) { 
                var prevTP_idx = vizObj.data[patient_id].timepoints.indexOf(d.prev_tp);
                return ((prevTP_idx + 0.5) / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth); 
            })
            .attr('y', 0)
            .attr('dy', '.71em')
            .text(function(d) { return d.pert_name; })
            .on('mouseover', function(d) {
                d3.selectAll(".pertGuide.pert_" + d.pert_name + '.' + patientID_class).attr('stroke-opacity', 1); 
            })
            .on('mouseout', function(d) {
                d3.selectAll(".pertGuide.pert_" + d.pert_name + '.' + patientID_class).attr('stroke-opacity', 0);
            });

        // plot guides
        vizObj.view[patient_id].tsSVG
            .selectAll('.pertGuide')
            .data(vizObj.userConfig.perturbations)
            .enter().append('line')
            .attr('class', function(d) { return 'pertGuide pert_' + d.pert_name + ' ' + patientID_class; })
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
                d3.selectAll(".tpGuide.tp_" + d + '.' + patientID_class).attr('stroke-opacity', 1); 
                
            })
            .on('mouseout', function(d) {
                d3.selectAll(".tpGuide.tp_" + d + '.' + patientID_class).attr('stroke-opacity', 0);
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
                return _gtypeMouseover(vizObj, d, patient_id);
            })
            .on('mouseout', function(d) {
                return _gtypeMouseout(vizObj, d, patient_id)
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
        vizObj.view[patient_id].tsTree
            .append('text')
            .attr('class', 'treeTitle')
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '.71em')
            .text('Tree'); 

        // d3 tree layout
        var treePadding = 10,
            treeTitleHeight = d3.select('.treeTitle').node().getBBox().height,
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
                return _gtypeMouseover(vizObj, d.id, patient_id);
            })
            .on('mouseout', function(d) {
                return _gtypeMouseout(vizObj, d.id, patient_id)
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
            .html("<input type=\"checkbox\" class=\"" + patient_id + "\">");

        // checkbox text
        vizObj.view[patient_id].tsSwitch
            .append("text")
            .attr("class", "switchTitle")
            .attr('x', 17)
            .attr('y', 15)
            .text("Tracks View")

        // when checkbox selected, change view
        d3.select("input." + patient_id).on("change", function() {
            _switchView(vizObj, patient_id);
        });

    })

  },

  resize: function(el, width, height, instance) {

    // var dim = vizObj.generalConfig;

    // dim.width = width;
    // dim.height = height;
    // dim.canvasSVGWidth = width - dim.padding - dim.padding;
    // dim.canvasSVGHeight = height - dim.padding - dim.padding;
    // dim.tsSVGHeight = dim.canvasSVGHeight - dim.xAxisHeight - dim.smallMargin;
    // dim.tsSVGWidth = dim.canvasSVGWidth - dim.legendWidth - dim.yAxisWidth - dim.smallMargin - dim.padding;
    // dim.xAxisWidth = dim.tsSVGWidth;
    // dim.yAxisHeight = dim.tsSVGHeight;

    // var canvasSVG = d3.select(".canvasSVG")
    //     .attr("width", dim.canvasSVGWidth) 
    //     .attr("height", dim.canvasSVGHeight);

    // var xAxisSVG = d3.select(".xAxisSVG")    
    //     .attr("transform", "translate(" + 0 + "," + (dim.tsSVGHeight + dim.smallMargin) + ")");

    // var tsLegendSVG = d3.select(".tsLegendSVG")
    //     .attr("transform", "translate(" + 
    //         (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.padding) + "," + 
    //         0 + ")");

    // // move the tree SVG down by the height of the legend
    // // 25 for legend title and space
    // var legendHeight = vizObj.data[patient_id].treeNodes.length * dim.legendGtypeHeight + 25 + 25; 
    // vizObj.view[patient_id].tsTree.attr("transform", "translate(" + 
    //     (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.padding) + "," + 
    //     legendHeight + ")");

    // // move the switch SVG down by the height of the legend + height of the tree
    // vizObj.view[patient_id].tsSwitch.attr("transform", "translate(" + 
    //     (dim.yAxisWidth + dim.smallMargin + dim.tsSVGWidth + dim.padding) + "," + 
    //     (dim.tsSVGHeight - 25) + ")");
    
    // // SET CONTENT

    // // if we want the spaced stacked view, recalculate the layout
    // var deferred = new $.Deferred();
    // if (!vizObj.userConfig.genotype_position) {
    //     // get the layout of genotypes at each time point
    //     _getLayout(vizObj, vizObj.userConfig.genotype_position);

    //     // in the layout, shift x-values if >1 genotype emerges at the 
    //     // same time point from the same clade in the tree
    //     _shiftEmergence(vizObj)
        
    //     // convert layout at each time point into a list of moves for each genotype's d3 path object
    //     vizObj.data[patient_id].traditional_paths = _getTraditionalPaths(vizObj);

    //     // get cellular prevalence labels
    //     vizObj.data[patient_id].ts_trad_labels = _getTraditionalCPLabels(vizObj);
    // }

    // // get traditional bezier paths
    // vizObj.data[patient_id].bezier_paths = _getBezierPaths(vizObj.data[patient_id].traditional_paths, dim.tsSVGWidth, dim.tsSVGHeight);

    // // get tracks bezier paths
    // vizObj.data[patient_id].tracks_bezier_paths = _getBezierPaths(vizObj.data[patient_id].tracks_paths, dim.tsSVGWidth, dim.tsSVGHeight);

    // // plot timesweep data
    // var newTsPlot;

    // if (dim.switchView) {
    //     newTsPlot = d3.selectAll('.tsPlot')
    //         .data(vizObj.data[patient_id].bezier_paths, function(d) {
    //             return d.gtype;
    //         });
    // } else {
    //     newTsPlot = d3.selectAll('.tsPlot')
    //         .data(vizObj.data[patient_id].tracks_bezier_paths, function(d) {
    //             return d.gtype;
    //         });
    // }
    // newTsPlot.enter().append('path');
    // newTsPlot.exit().remove();
    // newTsPlot
    //     .attr('d', function(d) { return d.path});

    // // plot time point guides
    // d3.selectAll('.tpGuide')
    //     .attr('x1', function(d, i) { return (i / (vizObj.data[patient_id].timepoints.length - 1)) * dim.tsSVGWidth; })
    //     .attr('x2', function(d, i) { return (i / (vizObj.data[patient_id].timepoints.length - 1)) * dim.tsSVGWidth; })
    //     .attr('y2', dim.tsSVGHeight);

    // // adjust cellular prevalence label (and background) positioning
    // d3.selectAll('.labelCirc, .sepLabelCirc')
    //     .attr('cx', function(d) { 

    //         // index of this time point relative to others
    //         var index = vizObj.data[patient_id].timepoints.indexOf(d.tp); 

    //         var x_val = (index / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth);

    //         // if the time point is the last
    //         if (index == vizObj.data[patient_id].timepoints.length - 1) {
    //             // shift it to the left
    //             x_val -= dim.circleR;
    //         }

    //         return x_val; 
    //     })
    //     .attr('cy', function(d) { 
    //         // if the label, when centered vertically...
    //         // ... is cut off at the top, shift down
    //         if (((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
    //             return 1 + dim.circleR;
    //         }

    //         // ... is cut off at the bottom, shift up
    //         else if (((d.middle*dim.tsSVGHeight) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
    //             return dim.tsSVGHeight - 1 - dim.circleR;
    //         }

    //         // ... is not cut off, center vertically
    //         return (1 - d.middle)*dim.tsSVGHeight; 
    //     });

    // d3.selectAll('.label, .sepLabel')
    //     .attr('x', function(d) { 

    //         // index of this time point relative to others
    //         var index = vizObj.data[patient_id].timepoints.indexOf(d.tp); 

    //         var x_val = (index / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth);

    //         // if the time point is the last
    //         if (index == vizObj.data[patient_id].timepoints.length - 1) {
    //             // shift it to the left
    //             x_val -= dim.circleR;
    //         }

    //         return x_val; 
    //     })
    //     .attr('y', function(d) { return (1 - d.middle)*dim.tsSVGHeight; })
    //     .attr('dy', function(d) {

    //         if (d.type == "traditional") {
    //             // if the label, when centered vertically...
    //             // ... is cut off at the top, shift down
    //             if (((dim.tsSVGHeight-(d.middle*dim.tsSVGHeight)) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
    //                 d3.select(this).attr('y', 1 + dim.circleR);
    //             }

    //             // ... is cut off at the bottom, shift up
    //             else if (((d.middle*dim.tsSVGHeight) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
    //                 d3.select(this).attr('y', dim.tsSVGHeight - 1 - dim.circleR);
    //             }

    //             // ... is not cut off, center vertically
    //             return '.35em';
    //         }
    //         else {
    //             // if the label, when centered vertically...
    //             // ... is cut off at the top, shift down
    //             if (((dim.tsSVGHeight-(d.top*dim.tsSVGHeight)) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
    //                 d3.select(this).attr('y', '1px');
    //                 return '.71em';
    //             }

    //             // ... is cut off at the bottom, shift up
    //             else if (((d.bottom*dim.tsSVGHeight) + ((d.cp/2)*dim.tsSVGHeight)) < dim.circleR) {
    //                 d3.select(this).attr('y', dim.tsSVGHeight);
    //                 return '-1px';
    //             }

    //             // ... is not cut off, center vertically
    //             return '.35em';
    //         }

    //     })
    //     .attr('fill', 'black')
    //     .attr('opacity', 0)
    //     .attr('text-anchor', 'middle')
    //     .style('pointer-events', 'none');


    // // PLOT AXES

    // // plot x-axis labels
    // d3.selectAll('.xAxisLabels')
    //     .attr('x', function(d, i) { 
    //         return (i / (vizObj.data[patient_id].timepoints.length-1)) * (dim.tsSVGWidth) + dim.smallMargin + dim.yAxisWidth; 
    //     });

    // // plot y-axis title
    // d3.select('.axisTitle.yAxis')
    //     .attr('x', 0)
    //     .attr('y', 0)
    //     .transition()
    //     .duration(300)
    //     .attr('transform', function() {
    //         return "translate(" + (dim.yAxisWidth/2) + ", " + (dim.tsSVGHeight/2) + ") rotate(-90)";
    //     });

    // // plot x-axis title
    // d3.select('.axisTitle.xAxis')
    //     .attr('x', dim.yAxisWidth + dim.smallMargin + dim.xAxisWidth/2);
   
    return {}
    
  }

});
