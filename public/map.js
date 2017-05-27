//create dropdown lists for year, age group, sex
var dropdownPath = "dropdownLists.json";

function readTextFile(file,callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");

    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == 200) {
            callback(rawFile.responseText);
        }
    }
    rawFile.open("GET", file, true);
    rawFile.send();
}


var year = 1990;
var age = 34;
var sex = 1;

var myObj = null;

function convertSex(sex_id){
    if(sex_id === 1){
        return 'male';
    }else if(sex_id === 2){
        return 'female';
    }else{
        return 'both';
    }
}


readTextFile(dropdownPath, function(text){
    myObj = JSON.parse(text);
    console.log(myObj);
    if(myObj == null){
        console.log("cannot retrieve json file");
    }else{
        var year = myObj[0].yearDropDown;
        var age = myObj[1].ageDropDown;
        var sex = myObj[2].sexDropDown;
        var continet = myObj[3].continentDropDown;

        //year dropList
        var yearSelect = document.getElementById("yearDropdown");


        for(var y = year.start; y <= year.end; y++){
            var option = document.createElement("option");
            option.value=y;
            option.innerHTML=y;
            yearSelect.appendChild(option);
        }

        //age dropList
        selectList("ageDropdown", age);

        //sex dropList
        selectList("sexDropdown", sex);

    }
});


function selectList(element,obj){
    var select = document.getElementById(element);
    for(var i = 0; i<obj.length;i++){
        var option = document.createElement("option");
        option.value=obj[i].id;
        option.innerHTML = obj[i].value;
        select.appendChild(option);
    }
}



//create map visualization
var filePath = "data/"+ year + "_" + age + "_" + sex + ".txt";
console.log(filePath);

var projection = d3.geo
    .equirectangular()
    .scale(150);

var height = 500;
var width = 1000;
var svg = d3.select("#worldMapContainer")
    .append("svg")
    .attr("id", "worldMap")
    .attr("width", width)
    .attr("height", height)
    .append('g')

var path = d3.geo
    .path()
    .projection(projection);

createMap(filePath);

function updateMap(attr,value){
    if(attr === 'year'){
        year = value;
    }else if(attr === 'age'){
        age = value;
    }else{
        sex = value;
    }
    filePath = "data/"+ year + "_" + age + "_" + sex + ".txt";
    svg.selectAll('*').remove();
    createMap(filePath);
    console.log('year_' + year +'_age_' + age + '_sex_' + sex);
    d3.select("#countryContainer").selectAll("*").remove();
    console.log('year after update:' + year);

}


function findOverweightedRate(arr){
    for(var i = 0; i<arr.length; i++){
        if(arr[i].metric === "overweight"){
            return arr[i].mean;
        }
    }
}

function createMap(filePath){

    //import data for selected country in specific year, age_group and sex
    var dataByCountry = d3.map();

    queue()
        .defer(d3.json, filePath)
        .await(renderMap);

    function renderMap(error, d){
        if (error) return console.warn(error);
        for(var i =0; i<d.length; i++){
            if(! dataByCountry.has(d[i].location)){
                dataByCountry.set(d[i].location, new Array());
            }
            var obj = {
                "metric" : d[i].metric,
                "mean" : d[i].mean,
                "lower" : d[i].lower,
                "upper" : d[i].upper
            }
            var value = dataByCountry.get(d[i].location);
            value.push(obj);
            dataByCountry.set(d[i].location, value);

        }

        worldMap();

    }


    //draw world map using countries.geojson
    function worldMap(){
        var color_domain = [10, 20, 30, 40, 50, 60, 70, 80, 90]
        var ext_color_domain = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]
        var legend_labels = ["< 10%", "10%+", "20%+", "30%+", "40%+", "50%+", "60%+","70%+", "80%+", ">90%"]
        var color = d3.scale.threshold()
            .domain(color_domain)
            .range(["#adfcad", "#ffcb40", "#ffba00", "#ffa100","#ff8c00", "#f9887f", "#f96154", "#f75454", "#fc2828", "#ba0101"]);


        var g = svg.append("g");

        d3.json("countries.geojson",
            function(error,json) {
                if (error) return console.warn(error);
                //add title
                g.append("svg:text")
                    .attr("class", "title")
                    .attr('font-weight', 'bold')
                    .attr('font-size', '20px')
                    .attr("x", 20)
                    .attr("y", 20)
                    .text("World Map for Obesity and Overweighted in year: " + year);


                //Adding legend for our Choropleth
                var legend = svg.selectAll("g.legend")
                    .data(ext_color_domain)
                    .enter().append("g")
                    .attr("class", "legend");

                var ls_w = 20, ls_h = 20;

                legend.append("rect")
                    .attr("x", 20)
                    .attr("y", function(d, i){ return height - (i*ls_h) - 2*ls_h - 40;})
                    .attr("width", ls_w)
                    .attr("height", ls_h)
                    .style("fill", function(d, i) { return color(d); })
                    .style("opacity", 0.8);

                legend.append("text")
                    .attr("x", 50)
                    .attr("y", function(d, i){ return height - (i*ls_h) - ls_h - 4 - 40;})
                    .text(function(d, i){ return legend_labels[i]; });

                //create paths
                g.selectAll("path")
                    .data(json.features)
                    .enter()
                    .append("path")
                    .attr("d", path)
                    .attr("fill", function(d) {
                        if(typeof dataByCountry.get(d.id) === 'undefined'){
                            return color(0);
                            //return "blue";
                        }else{
                            var o = dataByCountry.get(d.id);
                            return color(findOverweightedRate(o)*100);
                            //return "blue";
                        }
                    })
                    .on("click", clicked)
                    .on("mouseover", function(d) {
                        div.transition()
                            .duration(200)
                            .style("opacity", .9);
                        div .html(d.properties.name  + "\n" +
                                function(){
                                    if(typeof dataByCountry.get(d.id) === "undefined"){
                                        return 'N/A';
                                    }else{
                                        var o = dataByCountry.get(d.id)
                                        return o[0].metric + "_mean:" + o[0].mean
                                            + "(" + o[0].lower + "," + o[0].upper + ")\n"
                                            + o[1].metric + "_mean:" + o[1].mean
                                            + "(" + o[1].lower + "," + o[1].upper + ")";
                                    }
                                }())
                            .style("left", (d3.event.pageX) + "px")
                            .style("top", (d3.event.pageY - 28) + "px");
                    })
                    .on("mouseout", function(d) {
                        div.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });
            });
    }
}


// Define the div for the tooltip
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);




//import data for selected country for all years, all age groups, all sex
// male and female and both
var margin = { top: 30, right: 30, bottom: 40, left:50 }

var width_histogram = 1000 - margin.left - margin.right,
    height_histogram = 500 - margin.top - margin.bottom;



var tooltip = d3.select('body').append('div')
    .style('position', 'absolute')
    .style('padding', '0 10px')
    .style('background', 'white')
    .style('opacity', 0)



var xScale = d3.scale.linear()
    .domain([1989,2014])
    .range([0,width_histogram]);

var yScale = d3.scale.linear()
    .domain([0,1])
    .range([height_histogram,0]);

// Define the axes
var xAxis = d3.svg.axis().scale(xScale)
    .orient("bottom").ticks(30);

var yAxis = d3.svg.axis().scale(yScale)
    .orient("left").ticks(20);


function clicked(d) {

    d3.json('countries/'+d.id+".txt",
        function(error, json) {
            if (error) return console.warn(error);
            d3.select("#countryContainer").selectAll("*").remove();

            var histogramSvg =  d3.select("#countryContainer")
                .append("svg")
                .attr("id", 'histogram')
                .attr("width", width_histogram + margin.left + margin.right)
                .attr("height", height_histogram + margin.top + margin.bottom)
                .append('g')
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            //Create Title
            histogramSvg
                .append("text")
                .attr("x", width_histogram / 2 )
                .attr("y", 0)
                .style("text-anchor", "middle")
                .text(d.id + "'s Obesity and Overweighted bar chart");



            var bar = histogramSvg
                .selectAll('dot')
                .data(json);


            bar
                .enter()
                .append('rect')
                .attr("data-legend",function(d) { return d.metric})
                .filter(function(d,i){
                    return d.age_group_id == age & d.sex == convertSex(sex);
                })
                .attr("class", "bar")
                .attr("height", function(d,i){ return height_histogram - yScale(d.mean)})
                .attr("width", 10)
                .attr('x', function(d,i){
                    if(d.metric === 'obese'){
                        return xScale(d.year)-10;
                    }else{
                        return xScale(d.year);
                    }})
                .attr('y', function(d,i){return yScale(d.mean)})
                .style("fill", function(d){
                    if(d.metric === 'overweight'){
                        return 'orange';
                    }else{
                        return 'red';
                    }
                })
                .on("mouseover", function(d) {
                    console.log(d);
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip .html(d.mean)
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");

                    tempColor = this.style.fill;
                    d3.select(this)
                        .style('opacity', .5)
                        .style('fill', 'green')
                })
                .on("mouseout", function(d) {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                    d3.select(this)
                        .style('opacity', 1)
                        .style('fill', tempColor)
                });



            // Add the X Axis
            histogramSvg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height_histogram + ")")
                .call(xAxis);

            // Add the Y Axis
            histogramSvg.append("g")
                .attr("class", "y axis")
                .call(yAxis);


            //add legend
            var legend = histogramSvg.append("g")
                .attr("class", "legend")
                .attr("height", 100)
                .attr("width", 100)

            legend.selectAll('rect')
                .data(["obese","Overweighted"])
                .enter()
                .append("rect")
                .attr("x", width_histogram - 130)
                .attr("y", function(d, i){ return i *  20;})
                .attr("width", 10)
                .attr("height", 10)
                .style("fill", function(d){
                    if(d === 'obese'){
                        return 'red';
                    }else{
                        return 'orange';
                    }
                })

            legend.selectAll('text')
                .data(["obese","Overweighted"])
                .enter()
                .append("text")
                .attr("x", width_histogram - 100)
                .attr("y", function(d, i){ return i *  20 + 9;})
                .text(function(d) {
                    if(d === 'obese'){
                        return 'Obese';
                    }else{
                        return 'Overweighted';
                    }
                });

        });




}




