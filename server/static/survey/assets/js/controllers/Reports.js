
angular.module('askApp').controller('ReportCtrl', function($scope, $http, $location, $routeParams, reportsCommon, surveyShared) {
    function build_crosstab_url(sdate, edate, slug, qa, qb) {
        var url = ['/reports/crosstab', slug, qa, qb].join('/');
        url = url + '?startdate=' + sdate;
        url = url + '&enddate=' + edate;
        url = url + '&group=' + $scope.surveyorTimeFilter;

        if ($scope.market) {
            url = url + '&market=' + $scope.market;
        }
        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }
        return url;

    }
    function fish_weight_by_market(charts, start_date, end_date, slug) {
        var url = build_crosstab_url(start_date, end_date, slug, 'survey-site', 'total-weight');
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
                title: "Total Fish Weight by Market",
                type: data.type,
                displayTitle: false,
                labels: _.pluck(filtered, 'name'),
                data: filtered,
                download_url: url.replace("total-weight", "total-weight" + '.csv'),
                xLabel: 'Market',
                yLabel: 'Weight (kg)',
                order: 2,
                message: data.message,
                unit: 'kg'
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function fish_weight_by_province(charts, start_date, end_date, slug) {
        var url = build_crosstab_url(start_date, end_date, slug, 'province-purchased-caught', 'total-weight');
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
                title: "Total Fish Weight by Province",
                type: data.type,
                displayTitle: false,
                labels: _.pluck(filtered, 'name'),
                data: filtered,
                download_url: url.replace("total-weight", "total-weight" + '.csv'),
                xLabel: 'Province',
                yLabel: 'Weight (kg)',
                order: 3,
                message: data.message,
                unit: 'kg'
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function occurrence_of_sales(charts, start_date, end_date, slug) {
        var url = build_crosstab_url(start_date, end_date, slug, 'survey-site', 'how-sold');
        return $http.get(url).success(function(data) {
            charts.push({
                title: "Frequency of Sales Types",
                type: "stacked-column",
                yLabel: "Amount of Sales",
                labels: _.pluck(data.crosstab, 'name'),
                data: data.crosstab,
                formatFunc: function() { },
                download_url: url.replace("how-sold", "how-sold" + '.csv'),
                order: 1,
                seriesNames: data.seriesNames,
                message: data.message,
                unit: ''
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function occurrence_of_resource(charts, start_date, end_date, slug) {
        var url = build_crosstab_url(start_date, end_date, slug, 'survey-site', 'type-of-fish');
        return $http.get(url).success(function(data) {
            charts.push({
                title: "Frequency of Resource Type by Market",
                type: "stacked-column",
                labels: _.pluck(data.crosstab, 'name'),
                data: data.crosstab,
                download_url: url.replace("type-of-fish", "type-of-fish" + '.csv'),
                formatFunc: function() { return null; },
                yLabel: 'Number',
                order: 1,
                seriesNames: data.seriesNames,
                message: data.message,
                unit: ''
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function occurrence_of_bought_vs_caught(charts, start_date, end_date, slug) {
        var url = build_crosstab_url(start_date, end_date, slug, 'survey-site', 'buy-or-catch');
        return $http.get(url).success(function(data) {
            charts.push({
                title: "Frequency Vendor Bought or Caught Fish",
                type: "stacked-column",
                labels: _.pluck(data.crosstab, 'name'),
                formatFunc: function() { },
                yLabel: 'Fish Weight (kg)',
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
        var url = build_crosstab_url(start_date, end_date, slug, 'survey-site', 'fish-per-family');
        return $http.get(url).success(function(data) {
            charts.push({
                title: "Frequency of Fish Family by Market",
                displayTitle: false,
                type: "stacked-column",
                labels: false,//_.pluck(data.crosstab, 'name'),
                formatFunc: function() { return null; },
                data: data.crosstab,
                download_url: url.replace("fish-per-family", "fish-per-family" + '.csv'),
                order: 1,
                yLabel: "Number",
                seriesNames: data.seriesNames,
                message: data.message,
                unit: ''
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function average_trip_costs_by_market(charts, start_date, end_date, slug) {
        var url = build_crosstab_url(start_date, end_date, slug, 'survey-site', 'cost');
        return $http.get(url).success(function(data) {
            charts.push({
                title: "Average Vendor Expenses Per Trip",
                labels: _.pluck(data.crosstab, 'name'),
                seriesNames: data.seriesNames,
                formatFunc: function() { },
                type: data.type,
                data: data.crosstab,
                download_url: url.replace("cost", "cost" + '.csv'),
                xLabel: 'Market',
                yLabel: 'Average Expenses (SBD)',
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
        if ($scope.market) {
            url = url + '&market=' + $scope.market;
        }
        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }

        return $http.get(url).success(function(data) {
            var to_graph = {};
            _.each(_.keys(data.graph_data), function(item) {
                to_graph[item] = {
                    name: item,
                    data: _.map(data.graph_data[item], function(x) {
                        return [parseInt(x.date), parseFloat(x.total)];
                    })
                }
            });
            charts.push({
                title: "Vendor Expenses Over Time for All Markets",
                unit: '$',
                labels: _.keys(to_graph),
                download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + '.csv'),
                seriesNames: _.keys(to_graph),
                type: "time-series",
                raw_data: _.values(to_graph),
                xLabel: 'Market',
                yLabel: 'Expense (SBD)',
                order: 1,
                message: data.message
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }
    function min_max_charts(charts, start_date, end_date, slug) {
        var url = "/reports/grid-standard-deviation/price-per-pound/" + $scope.surveyorTimeFilter
            url = url + '?startdate=' + start_date;
            url = url + '&enddate=' + end_date;
            url = url + '&col=Day1';
        if ($scope.market) {
            url = url + '&market=' + $scope.market;
        }
        if ($scope.status_single) {
            url += '&status=' + $scope.status_single;
        }
        var fish_name_whitelist = ["Common Reef Fish", "Coral grouper/Coral trout",
            "Deepwater Snapper", "Humphead/Napoleon Wrasse", "Kingfish",
            "Ratfish", "Spanish Mackerel", "Topa",
            "Mollusc/squid/octopus/lobster"];

        return $http.get(url).success(function(data) {
            var to_graph = {}
            _.each(_.keys(data.graph_data), function(item) {
                to_graph[item] = {
                    name: item,
                    min_data: _.map(data.graph_data[item], function(x) {
                        return [parseInt(x.date), parseFloat(x.minimum)];
                    }),
                    max_data: _.map(data.graph_data[item], function(x) {
                        return [parseInt(x.date), parseFloat(x.maximum)];
                    })
                }
            });
            to_graph = _.filter(to_graph, function(x) {
                return fish_name_whitelist.indexOf(x.name) != -1;
            });
            _.each(to_graph, function(x) {
                var min_struct = {
                    name: x.name + " Minimum",
                    data: x.min_data
                }
                var max_struct = {
                    name: x.name + " Maximum",
                    data: x.max_data
                }
                charts.push({
                    title: "Max/Min Price on First Day of Sale - " + x.name,
                    labels: ["Min Price", "Max Price"],
                    download_url: url.replace($scope.surveyorTimeFilter, $scope.surveyorTimeFilter + '.csv'),
                    seriesNames: data.seriesNames,
                    type: "time-series",
                    raw_data: [ min_struct, max_struct],
                    xLabel: 'Date',
                    yLabel: 'Price per {ound (SBD)',
                    order: 1,
                    message: data.message,
                    unit: "$"
                });
            });
            charts.sort(function (a,b) { return a-b;})
        });
    }

    function total_weight_for_market(charts, start_date, end_date, slug) {
        var url = build_crosstab_url(start_date, end_date, slug, 'survey-site', 'total-weight');

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

            var bar_data = _.map(filtered,
                function (x) {
                    return _.reduce(x.value, function (attr, val) { return attr + parseInt(val.sum); }, 0);
                }
            );

            charts.push({
                title: "Total Weight by Market",
                displayTitle: false,
                labels: _.pluck(filtered, 'name'),
                seriesNames: data.seriesNames,
                type: 'bar-chart',
                data: bar_data,
                unit: 'kg',
                download_url: url.replace("total-weight", "total-weight" + '.csv'),
                xLabel: 'Market',
                yLabel: 'Weight (kg)',
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
            $scope.subtitle = "Economic Report"
            occurrence_of_bought_vs_caught($scope.charts, start_date, end_date,
                surveySlug);
            occurrence_of_sales($scope.charts, start_date, end_date,
                surveySlug);
            average_trip_costs_by_market($scope.charts, start_date, end_date,
                surveySlug);
            expenses_over_time($scope.charts, start_date, end_date,
                surveySlug);
            $scope.sectioned_charts["Max / Min Reported Market Prices "] = [];
            min_max_charts($scope.sectioned_charts["Max / Min Reported Market Prices "], start_date, end_date, surveySlug);
        } else if ($scope.activePage == 'biological') {
            $scope.subtitle = "Biological Report"
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
    $scope.market = $location.search().survey_site || null;
    $scope.surveyorTimeFilter = 'week';
    $scope.filter = null;
    $scope.charts = [];
    $scope.sectioned_charts = {};
    $scope.viewPath = app.viewPath;
    $scope.surveyorTimeFilter = 'week';
    $scope.activePage = $routeParams.reportName.toLowerCase();
    $scope.statuses = [];
    $scope.status_single = $location.search().status || null;

    surveyShared.getSurvey(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        reportsCommon.setup_market_dropdown($scope);
        var start_date = reportsCommon.dateFromISO($scope.survey.response_date_start);
        var end_date = reportsCommon.dateFromISO($scope.survey.response_date_end);
        $scope.filter = {
            min: start_date.valueOf(),
            max: end_date.valueOf(),
            startDate: start_date.valueOf(),
            endDate: end_date.valueOf()
        }
    });

    $scope.getRespondents = function(url) {
        // Higher order function to make the next/prve buttons work.
        return reportsCommon.getRespondents(url, $scope);
    }

    $scope.$watch('filter', function (newValue) {
        if (newValue) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);

    $scope.$watch('status_single', function (newValue) {
        if ($scope.filter) {
            filters_changed($routeParams.surveySlug);
        }
    }, false);

    $scope.$watch('market', function (newValue) {
        if ($scope.filter) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);

    $scope.$watch('surveyorTimeFilter', function (newValue) {
        if ($scope.filter) {
            filters_changed($routeParams.surveySlug);
        }
    }, true);
});
