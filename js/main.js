//begin script when window loads
window.onload = setMap();

function setMap(){

    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([12.5, 42])
        .rotate([-2, 0, 0])
        .parallels([43, 62])
        .scale(2500)
        .translate([width / 2, height / 2]);
    
    var path = d3.geoPath()
        .projection(projection)
    
    var promises = [];
        promises.push(d3.csv("data/italyData.csv")); //load attributes from csv
        promises.push(d3.json("data/EuropeCountries.topojson")); //load background spatial data
        promises.push(d3.json("data/ITregions.topojson")); //load choropleth spatial data
        Promise.all(promises).then(callback);
    function callback(data){
        
        csvData = data[0];
        europe = data[1];
        italy = data[2];

        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude
         //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule
        //create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
        
        //translate europe TopoJSON
        var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries),
            italyRegions = topojson.feature(italy, italy.objects.ITregions).features;

        //add Europe countries to map
        var countries = map.append("path")
            .datum(europeCountries)
            .attr("class", "countries")
            .attr("d", path);
        
//        //join csv data to GeoJSON enumeration units
//        italyRegions = joinData(italyRegions, csvData);
//
//        //create the color scale
//        var colorScale = makeColorScale(csvData);
//
//        //add enumeration units to the map
//        setEnumerationUnits(italyRegions, map, path, colorScale);
//
//        //add coordinated visualization to the map
//        setChart(csvData, colorScale);
//
//        // dropdown
//        createDropdown(csvData);

    };
}; //end of setMap()
