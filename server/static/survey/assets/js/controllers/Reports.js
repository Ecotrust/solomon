
angular.module('askApp').controller('ReportCtrl', function($scope, $http, $routeParams, reportsCommon, surveyShared) {
    function fish_weight_by_market(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'survey-site', 'total-weight'].join('/');
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            charts.push({
                title: "Total Fish Weight by Market",
                type: data.type,
                labels: _.pluck(data.crosstab, 'name'),
                data: _.pluck(data.crosstab, 'value'),
                download_url: url.replace("total-weight", "total-weight" + '.csv'),
                xLabel: 'Market',
                yLabel: 'Total Weight (kg)',
                order: 2,
                message: data.message,
                unit: 'kg'
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function fish_weight_by_province(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'province-purchased-caught', 'total-weight'].join('/');
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            charts.push({
                title: "Total Fish Weight by Province",
                type: data.type,
                labels: _.pluck(data.crosstab, 'name'),
                data: _.pluck(data.crosstab, 'value'),
                download_url: url.replace("total-weight", "total-weight" + '.csv'),
                xLabel: 'Province',
                yLabel: 'Total Weight (kg)',
                order: 3,
                message: data.message,
                unit: 'kg'
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function occurrence_of_resource(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'survey-site', 'type-of-fish'].join('/');
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            charts.push({
                title: "Frequency of Resources",
                type: "stacked-column",
                labels: _.pluck(data.crosstab, 'name'),
                data: data.crosstab,
                download_url: url.replace("type-of-fish", "type-of-fish" + '.csv'),
                order: 1,
                seriesNames: data.seriesNames,
                message: data.message,
                unit: ''
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function occurrence_of_bought_vs_caught(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'survey-site', 'buy-or-catch'].join('/');
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            charts.push({
                title: "Occurrence of Bought vs. Caught",
                type: "stacked-column",
                labels: _.pluck(data.crosstab, 'name'),
                data: data.crosstab,
                download_url: url.replace("buy-or-catch", "buy-or-catch" + '.csv'),
                order: 1,
                seriesNames: data.seriesNames,
                message: data.message,
                unit: ''
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }
    function occurrence_per_family(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'survey-site', 'fish-per-family'].join('/');
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            charts.push({
                title: "Fish Families Per Market",
                type: "stacked-column",
                labels: _.pluck(data.crosstab, 'name'),
                data: data.crosstab,
                download_url: url.replace("fish-per-family", "fish-per-family" + '.csv'),
                order: 1,
                seriesNames: data.seriesNames,
                message: data.message,
                unit: ''
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function average_trip_costs_by_market(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'survey-site', 'cost'].join('/');
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            charts.push({
                title: "Average Trip Costs by Market",
                labels: _.pluck(data.crosstab, 'name'),
                seriesNames: data.seriesNames,
                type: data.type,
                data: data.crosstab,
                download_url: url.replace("cost", "cost" + '.csv'),
                xLabel: 'Market',
                yLabel: 'Average Trip Costs',
                order: 1,
                message: data.message
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }
    function expenses_over_time(charts, start_date, end_date, slug) {
        var url = "/reports/grid-standard-deviation/cost/" + $scope.surveyorTimeFilter
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            var to_graph = {};
            for (var i in data.graph_data) {
                current = data.graph_data[i];
                if (to_graph[current.row_text]) {
                    if (to_graph[current.row_text].data[current.date]) {
                        to_graph[current.row_text].data[current.date] += parseFloat(current.average);
                    } else {
                        to_graph[current.row_text].data[current.date] = parseFloat(current.average);
                    }
                } else {
                    to_graph[current.row_text] = { name: current.row_text, data: {} };
                    to_graph[current.row_text].data[current.date] = parseFloat(current.average);
                }
            }
            for (var i in to_graph) {
                to_graph[i].data = _.map(_.keys(to_graph[i].data),
                        function (x) { return [parseInt(x), to_graph[i].data[x]]; });
            }
            charts.push({
                title: "Expenses Over Time",
                unit: '$',
                labels: _.keys(to_graph),
                seriesNames: _.keys(to_graph),
                type: "time-series",
                raw_data: _.values(to_graph),
                xLabel: 'Market',
                yLabel: 'Average Trip Costs',
                order: 1,
                message: data.message
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }
    function total_expenses_over_time(charts, start_date, end_date, slug) {
        var url = "/reports/grid-standard-deviation/cost/" + $scope.surveyorTimeFilter
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;

        return $http.get(url).success(function(data) {
            var to_graph = {
                min: { name: "Minimum", data: {}},
                average: { name: "Average", data: {}},
                max: { name: "Maximum", data: {}}
            }

            for (var i in data.graph_data) {
                var current = data.graph_data[i];
                if (to_graph.min.data[current.date]) {
                    to_graph.min.data[current.date] += parseFloat(current.minimum);
                } else {
                    to_graph.min.data[current.date] = parseFloat(current.minimum);
                }

                if (to_graph.max.data[current.date]) {
                    to_graph.max.data[current.date] += parseFloat(current.maximum);
                } else {
                    to_graph.max.data[current.date] = parseFloat(current.maximum);
                }

                if (to_graph.average.data[current.date]) {
                    to_graph.average.data[current.date] += parseFloat(current.average);
                } else {
                    to_graph.average.data[current.date] = parseFloat(current.average);
                }
            }
            to_graph.min.data = _.map(_.keys(to_graph.min.data),
                    function (x) { return [parseInt(x), to_graph.min.data[x]]; });

            to_graph.max.data = _.map(_.keys(to_graph.max.data),
                    function (x) { return [parseInt(x), to_graph.max.data[x]]; });

            to_graph.average.data = _.map(_.keys(to_graph.average.data),
                    function (x) { return [parseInt(x), to_graph.average.data[x]]; });
            charts.push({
                title: "Expenses Over Time",
                labels: ["Minimum", "Average", "Maximum"],
                seriesNames: ["Minimum", "Average", "Maximum"],
                type: "time-series",
                raw_data: [to_graph.min, to_graph.average, to_graph.max],
                download_url: url.replace("cost", "cost" + '.csv'),
                xLabel: 'Market',
                yLabel: 'Average Trip Costs',
                order: 1,
                message: data.message
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function total_weight_for_market(charts, start_date, end_date, slug) {
        var url = ['/reports/crosstab', slug, 'survey-site', 'total-weight'].join('/');
        url = url + '?startdate=' + start_date;
        url = url + '&enddate=' + end_date;
        url = url + '&group=week';

        return $http.get(url).success(function(data) {
            var sdate = new Date($scope.filter.startDate);
            var edate = new Date($scope.filter.endDate);

            var filtered = _.map(data.crosstab, function(answer) {
                answer.value = _.filter(answer.value, function(x) {
                    var d = reportsCommon.dateFromISO(x.date);
                    return (d >= sdate && d <= edate);
                });
                return answer;
            });

            charts.push({
                title: "Total Weight for Week by Market",
                labels: _.pluck(filtered, 'name'),
                seriesNames: data.seriesNames,
                type: data.type,
                data: filtered,
                unit: 'kg',
                download_url: url.replace("total-weight", "total-weight" + '.csv'),
                xLabel: 'Market',
                yLabel: 'Total Weight (kg)',
                order: 4,
                startDate: start_date,
                endDate: end_date,
                message: data.message
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function filters_changed(surveySlug) {
        $scope.charts = [];
        $scope.getRespondents();

        var start_date = new Date($scope.filter.startDate).toString('yyyyMMdd');
        var end_date = new Date($scope.filter.endDate).toString('yyyyMMdd');

        // FIXME: Actually pull these charts from the DB or something.
        if ($scope.activePage == 'economic') {
            $scope.subtitle = "Socio-Economic Information"
            occurrence_of_bought_vs_caught($scope.charts, start_date, end_date,
                surveySlug);
            average_trip_costs_by_market($scope.charts, start_date, end_date,
                surveySlug);
            expenses_over_time($scope.charts, start_date, end_date,
                surveySlug);
        } else if ($scope.activePage == 'biological') {
            $scope.subtitle = "Biologic Information"
            occurrence_of_resource($scope.charts, start_date, end_date,
                surveySlug);
            occurrence_per_family($scope.charts, start_date, end_date,
                surveySlug);
            fish_weight_by_province($scope.charts, start_date, end_date,
                surveySlug);
            fish_weight_by_market($scope.charts, start_date, end_date,
                surveySlug)
            total_weight_for_market($scope.charts, start_date, end_date,
                surveySlug);
        }
    }
    $scope.surveyorTimeFilter = 'week';
    $scope.filter = null;
    $scope.charts = [];
    $scope.viewPath = app.viewPath;
    $scope.surveyorTimeFilter = 'week';
    $scope.activePage = $routeParams.reportName.toLowerCase();

    surveyShared.getSurvey(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        var start_date = reportsCommon.dateFromISO($scope.survey.response_date_start);
        var end_date = reportsCommon.dateFromISO($scope.survey.response_date_end);
        $scope.filter = {
            startDate: start_date.valueOf(),
            endDate: end_date.valueOf()
        }
    });

    $scope.getRespondents = function (url) {
        $scope.respondentsLoading = true;
        if (! url) {
            url = '/api/v1/reportrespondant/?format=json&limit=10&survey__slug__exact=' + $routeParams.surveySlug;
        }
        if ($scope.filter.startDate && url.indexOf("&ts__gte=") == -1) {
            url = url + '&ts__gte=' + new Date($scope.filter.startDate).add(-1).day().toString('yyyy-MM-dd');
        }
        if ($scope.filter.endDate && url.indexOf("&ts__lte=") == -1) {
            url = url + '&ts__lte=' + new Date($scope.filter.endDate).add(2).day().toString('yyyy-MM-dd');
        }

        $http.get(url).success(function(data) {
            $scope.respondentsLoading = false;
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
        });
    }

    $scope.$watch('filter', function (newValue) {
        if (newValue) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);

    $scope.$watch('surveyorTimeFilter', function (newValue) {
        if ($scope.filter) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);
});
