(function(){
var attrArray = ["AGE_5", "AGE_25", "AGE_45", "AGE_65", "AGE_85"];
var expressed = attrArray[1];
    
//chart frame dimensions
var chartWidth = window.innerWidth * 0.425,
    chartHeight = 473,
    leftPadding = 40,
    rightPadding = 5,
    topBottomPadding = 1,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([chartHeight - 10, 0])
    .domain([0, 88*1.1]);


//begin script when window loads
window.onload = setMap();

function setMap(){

    //map frame dimensions to be modified based on the size of the window
    var width = window.innerWidth * 0.5,
        height = 460;

    //svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //having the projection parameters be focused on italy
    var projection = d3.geoAlbers()
        .center([12.5, 42])
        .rotate([-2, 0, 0])
        .parallels([43, 62])
        .scale(2500)
        .translate([width / 2, height / 2]);
    
    //setting the projection using above parameters
    var path = d3.geoPath()
        .projection(projection)
    
    //using promises rather than defer to queue the data
    var promises = [];
        promises.push(d3.csv("data/italyData.csv")); //all age data from csv
        promises.push(d3.json("data/EuropeCountries.topojson")); //background countries
        promises.push(d3.json("data/ItalyRegions.topojson")); //the italy region data
        Promise.all(promises).then(callback);
   
    function callback(data){
        
        csvData = data[0];
        europe = data[1];
        italy = data[2];

        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude
         //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) 
            .attr("class", "gratBackground")
            .attr("d", path)
        //create graticule lines
        var gratLines = map.selectAll(".gratLines") 
            .data(graticule.lines())
            .enter()
            .append("path")
            .attr("class", "gratLines")
            .attr("d", path);
        
        //translate europe TopoJSON and italy topoJSON
        var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries);
        var italyRegions = topojson.feature(italy, italy.objects.collection).features;
        
        //add Europe countries to map
        var countries = map.append("path")
            .datum(europeCountries)
            .attr("class", "countries")
            .attr("d", path);
        
        

        //join csv data to GeoJSON enumeration units
        italyRegions = joinData(italyRegions, csvData);

        //create the color scale
        var colorScale = makeColorScale(csvData);

        //add enumeration units to the map
        setEnumerationUnits(italyRegions, map, path, colorScale);

        //add chart with colorscale
        setChart(csvData, colorScale);

        // dropdown menue for age selection
        createDropdown(csvData);
        
        //making the label
        setLabel(csvData)

    }
}; //end of setMap()


function joinData(italyRegions, csvData){
//looping through the data to join it to topojson
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i];
        var csvKey = csvRegion.ID_1;

        //loop through geojson regions to find correct region
        for (var a=0; a<italyRegions.length; a++){

            var geojsonProps = italyRegions[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.ID_1; //the geojson primary key

            //if statement for matching data
            if (geojsonKey == csvKey){

                //assign all attributes and values from csv to topojson
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]);
                    geojsonProps[attr] = val;
                });
            };
        };
    };


    return italyRegions;
};


function makeColorScale(data){
    //using greens
    var colorClasses = [
        "#edf8fb",
        "#b2e2e2",
        "#66c2a4",
        "#2ca25f",
        "#006d2c"
    ];

//create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
};


//tests for null values in the csv data
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

//this is changing the data presentation as the attribute selection changes
function setEnumerationUnits(italyRegions, map, path, colorScale){
    var regions = map.selectAll(".regions")
        .data(italyRegions)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.ID_1;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        //adding mouseover functionality for data retrieval
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

    var desc = regions.append("desc")
    .text('{"stroke": "#000", "stroke-width": "0.5px"}');
};

//creates the chart off to the side

function setChart(csvData, colorScale){

    //svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);


    //set bars for each region
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.ID_1;
        })
    //mouseover capabilities
        .attr("width", chartInnerWidth / csvData.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);


    var desc = bars.append("desc")
    .text('{"stroke": "none", "stroke-width": "0px"}');

    //The text for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of people of " + expressed[3] + " in each region");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
    
        //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.ID_1;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        })
        .text(function(d){
            return d[expressed];
        });
    //set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);
};

function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Age");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};


function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;


    // change yscale dynamically
    csvmax = d3.max(csvData, function(d) { return parseFloat(d[expressed]); });
    
    yScale = d3.scaleLinear()
        .range([chartHeight - 10, 0])
        .domain([0, csvmax*1.1]);

    //updata vertical axis 
    d3.select(".axis").remove();
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = d3.select(".chart")
        .append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);
    

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var regions = d3.selectAll(".regions")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });

    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);

    updateChart(bars, csvData.length, colorScale);
};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    
    //add text to chart title
    var chartTitle = d3.select(".chartTitle")
        .text("Number of people aged " + expressed[4]+ expressed[5] + " in each region");
};

    
    
    
//The spot with the most errors    
//Everthing that deals with hovering the mouse and labels


//function to highlight regions and bars
function highlight(props){
    //change stroke to white
    var selected = d3.selectAll("." + props.ID_1)
        .style("stroke", "white")
        .style("stroke-width", "3");
    
    setLabel(props);
};

//function to revert stroke after moving mouse out
function dehighlight(props){
    var selected = d3.selectAll("." + props.ID_1)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    
    //remove info label
    d3.select(".infolabel")
        .remove();

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>"; //should be the population count 

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.ID_1 + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.NAME_1); //region name
};

//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY + 85,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate boundary
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate boundary
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};


    
})();