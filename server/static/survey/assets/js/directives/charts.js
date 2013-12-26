angular.module('askApp')
    .directive('barChart', function($http) {
        return {
            templateUrl: '/static/survey/views/chart_400.html',
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                chart: "=chart"
            },

            link: function postLink(scope, element, attrs) {

                scope.$watch('chart', function(newValue) {
                    // Draw the graph
                    var labels, data, series;

                    if (newValue && !newValue.message) {
                        if (scope.chart.data && scope.chart.data.length !== 0) {
                            series = _.map(scope.chart.data, function(item, index) {
                                return {
                                    name: scope.chart.labels[index],
                                    data: [parseFloat(item) || 0],
                                    dataLabels: {
                                        enabled: true
                                    }
                                };
                            });
                        } else {
                            series = [{
                                name: "No Data",
                                data: []
                            }]
                        }

                        element.find(".chart").highcharts({
                            chart: {
                                // 'bar-chart' isn't a chart highcharts understands, so we map it
                                // to just 'bar'. This is easier than fixing it all the way down.
                                type: scope.chart.type == 'bar-chart' ? 'column' : 'bar'
                            },
                            backgroundColor: 'rgba(255, 255, 255, 0)',
                            title: {
                                text: scope.chart.title || false
                            },
                            tooltip: {
                                formatter: function() {
                                    return '<b>' + this.series.name + '</b>' + ': ' + this.y;
                                }
                            },
                            xAxis: {
                                title: {
                                    text: scope.chart.xLabel
                                }
                            },
                            yAxis: {
                                title: {
                                    text: scope.chart.yLabel
                                }
                            },
                            series: series,
                            credits: {
                                enabled: false
                            }
                        });
                    }
                })
            }
        }
    });

angular.module('askApp')
    .directive('stackedColumn', function($http) {
        return {
            templateUrl: '/static/survey/views/chart_750.html',
            restrict: 'EA',
            replace: true,
            transclude: true,
            scope: {
                chart: "=chart"
            },

            link: function postLink(scope, element, attrs) {
                scope.$watch('chart', function(newValue) {
                    // Draw the graph
                    if (newValue && !newValue.message) {
                        var chart;
                        var series = _.map(scope.chart.seriesNames, function(name) {
                            return {
                                name: name,
                                data: _.map(scope.chart.data, function(item) {
                                    var found = _.findWhere(item.value, {
                                        row_text: name
                                    }) || _.findWhere(item.value, { answer_text: name });
                                    if (found) {
                                        return found.average === 0 ? null : (found.average || found.count);
                                    } else {
                                        return null;
                                    }


                                })
                            }
                        });
                        chart = element.find(".chart").highcharts({
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
                                }
                            },
                            yAxis: {
                                min: 0,
                                title: {
                                    text: scope.chart.yLabel || 'Average Cost (SBD)'
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
                            // Commenting this out as per sprint.ly #148.
                            //legend: {
                            //    align: 'right',
                            //    x: -70,
                            //    verticalAlign: 'top',
                            //    y: 20,
                            //    floating: true,
                            //    backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColorSolid) || 'white',
                            //    borderColor: '#CCC',
                            //    borderWidth: 1,
                            //    shadow: false
                            //},
                            tooltip: {
                                formatter: function() {
                                    return this.series.name + ': ' + this.y + '<br/>' +
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
                            // Display something when there is no data:
                            series: (series && series.length !== 0) ? series : [{
                                name: "No Data",
                                data: []
                            }]
                        });
                    }
                });

            }
        }
    });


angular.module('askApp')
    .directive('timeSeries', function($http) {
        return {
            templateUrl: '/static/survey/views/chart_400.html',
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
                        var data = null;

                        if (scope.chart.data && scope.chart.data.length !== 0) {
                            data = _.map(scope.chart.data, function(item) {
                                return {
                                    name: item.name,
                                    data: _.map(item.value, function(value) {
                                        var current = parseFloat(value.sum);
                                        if (_.isNumber(current) && !_.isNaN(current)) {
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
                        } else {
                            data = [{
                                name: "No Data",
                                data: []
                            }];
                        }
                        element.find(".chart").highcharts({
                            chart: {
                                type: 'line'
                            },
                            title: { text: scope.chart.title } || false,
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
                            formatter: function() {
                                return '<b>' + this.series.name + '</b><br/>' +
                                    Highcharts.dateFormat('%d/%m/%y', this.x) + ': ' + this.y + ' ' + scope.chart.unit || 'kg';
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
                                        Highcharts.dateFormat('%d/%m/%y', this.x) + ': ' + this.y + ' ' + scope.chart.unit || 'kg';
                                }
                            },
                            series: scope.chart.raw_data ? scope.chart.raw_data : data,
                            credits: {
                                enabled: false
                            }
                        });
                    }
                });

            }
        }
    });
