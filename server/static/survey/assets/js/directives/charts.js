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