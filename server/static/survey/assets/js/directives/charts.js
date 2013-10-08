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

                    if (newValue) {
                        labels = _.map(scope.chart.labels, function(item, index) {
                            return [index, item];
                        });
                        data = _.map(scope.chart.data, function(item, index) {
                            return [index, item];
                        });

                        Flotr.draw(
                            element[0], [data], {
                                HtmlText: false,
                                fontSize: 12,
                                mouse: {
                                    track: false
                                },
                                bars: {
                                    show: true,
                                    horizontal: false,
                                    shadowSize: 0,
                                    barWidth: 0.5
                                },
                                mouse: {
                                    track: true,
                                    relative: true
                                },
                                xaxis: {
                                    fontSize: 12,
                                    ticks: labels,
                                    title: scope.chart.xLabel
                                },
                                yaxis: {
                                    fontSize: 12,
                                    min: 0,
                                    autoscaleMargin: 1,
                                    autscale: true,
                                    title: scope.chart.yLabel,
                                    titleAngle: 90

                                }
                            }
                        );
                    }


                })

            }
        }
    });

angular.module('askApp')
    .directive('stackedColumn', function($http) {
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
                    var chart;
                    var series = _.map(scope.chart.seriesNames, function (name) {
                        return {
                            name: name,
                            data: _.map(scope.chart.data, function (item) {
                                var found = _.findWhere(item.value, {row_text: name});
                                if (found) {
                                    return _.findWhere(item.value, {row_text: name}).average;    
                                }
                                else {
                                    return 0;
                                }
                                
                                
                            })
                        }
                    });
                    console.log(series);
                    if (newValue) {
                        chart = element.highcharts({
                            chart: {
                                type: 'column'
                            },
                            backgroundColor:'rgba(255, 255, 255, 0)',
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