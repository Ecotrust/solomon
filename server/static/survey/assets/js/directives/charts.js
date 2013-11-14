angular.module('askApp')
    .directive('barChart', function($http) {
        return {
            template: '<div style="height: 400px"></div>',
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                chart: "=chart"
            },

            link: function postLink(scope, element, attrs) {

                scope.$watch('chart', function(newValue) {
                    // Draw the graph
                    var labels, data;

                    if (newValue && !newValue.message) {
                        data = _.map(scope.chart.data, function(item, index) {
                            return parseFloat(item);
                        });

                        $(element[0]).highcharts({
                            chart: {
                                type: 'column'
                            },
                            backgroundColor: 'rgba(255, 255, 255, 0)',
                            title: {
                                text: false
                            },
                            xAxis: {
                                categories: scope.chart.labels,
                                title: {
                                    text: scope.chart.xLabel
                                }
                            },
                            yAxis: {
                                title: {
                                    text: scope.chart.yLabel
                                }
                            },
                            series: [{
                                name: "test",
                                data: data,
                                dataLabels: {
                                    enabled: true,
                                }
                            }]
                        });
                    }
                })
            }
        }
    });

angular.module('askApp')
    .directive('stackedColumn', function($http) {
        return {
            template: '<div style="height: 750px"></div>',
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                chart: "=chart"
            },

            link: function postLink(scope, element, attrs) {



                scope.$watch('chart', function(newValue) {
                    // Draw the graph
                    console.log(newValue);
                    if (newValue && !newValue.message) {
                        var chart;
                        var series = _.map(scope.chart.seriesNames, function(name) {
                            return {
                                name: name,
                                data: _.map(scope.chart.data, function(item) {
                                    var found = _.findWhere(item.value, {
                                        row_text: name
                                    });
                                    if (found) {
                                        return found.average === 0 ? null : found.average;
                                    } else {
                                        return null;
                                    }


                                })
                            }
                        });
                        console.log(series);
                        chart = element.highcharts({
                            chart: {
                                type: 'column'
                            },
                            backgroundColor: 'rgba(255, 255, 255, 0)',
                            title: {
                                text: false
                            },
                            xAxis: {
                                categories: scope.chart.labels,
                                title: {
                                    text: 'Market'
                                },
                            },
                            yAxis: {
                                min: 0,
                                title: {
                                    text: 'Average Cost (SBD)'
                                },
                                stackLabels: {
                                    enabled: true,
                                    style: {
                                        fontWeight: 'bold',
                                        color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                                    }
                                }
                            },
                            credits: {
                                enabled: false
                            },
                            legend: {
                                align: 'right',
                                x: -70,
                                verticalAlign: 'top',
                                y: 20,
                                floating: true,
                                backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColorSolid) || 'white',
                                borderColor: '#CCC',
                                borderWidth: 1,
                                shadow: false
                            },
                            tooltip: {
                                formatter: function() {
                                    return '<b>' + this.x + '</b><br/>' +
                                        this.series.name + ': ' + this.y + '<br/>' +
                                        'Total: ' + this.point.stackTotal;
                                }
                            },
                            plotOptions: {
                                column: {
                                    stacking: 'normal',
                                    dataLabels: {
                                        enabled: true,
                                        color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white'
                                    }
                                }
                            },
                            series: series
                        });
                    }
                });

            }
        }
    });


angular.module('askApp')
    .directive('timeSeries', function($http) {
        return {
            template: '<div style="height: 400px"></div>',
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                chart: "=chart",
                filter: "=filter"
            },

            link: function postLink(scope, element, attrs) {



                scope.$watch('chart', function(newValue) {
                    // Draw the graph
                    if (newValue && !newValue.message) {
                        var chart;

                        var data = _.map(scope.chart.data, function (item) {
                            return {
                                name: item.name,
                                data: _.map(item.value, function (value) {
                                    var current = parseFloat(value.sum);
                                    if (_.isNumber(current) && ! _.isNaN(current)) {
                                        return [
                                            new Date(value.date).getTime(),
                                            parseFloat(current)
                                        ]    
                                    } else {
                                        return [
                                            new Date(value.date).getTime(),
                                            null
                                        ]    
                                    }         
                                })
                            }
                        });
                        
                        element.highcharts({
                            chart: {
                                type: 'spline'
                            },
                            title: false,
                            subtitle: false,
                            xAxis: {
                                type: 'datetime',
                                dateTimeLabelFormats: { // don't display the dummy year
                                    month: '%d/%m/%y',
                                    year: '%d/%m/%y'
                                },
                                labels: {
                                    formatter: function() {
                                        return Highcharts.dateFormat('%d/%m/%y', this.value);
                                        
                                    }
                                }
                            },
                            yAxis: {
                                title: {
                                    text: scope.chart.yLabel
                                },
                                min: 0
                            },
                            tooltip: {
                                formatter: function() {
                                    return '<b>' + this.series.name + '</b><br/>' +
                                        Highcharts.dateFormat('%d/%m/%y', this.x) + ': ' + this.y + ' kg';
                                }
                            },

                            series: data
                        });
                    }
                });

            }
        }
    });
