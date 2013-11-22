//'use strict';

function fish_weight_by_market($http, charts, start_date, end_date, slug) {
    var url = ['/reports/crosstab', slug, 'survey-site', 'total-weight'].join('/');
        url = url + '?startdate=' + start_date;
        url = url + '&enddate=' + end_date;

    return $http.get(url).success(function(data) {
        charts.push({
            title: "Total Fish Weight by Market",
            type: data.type,
            labels: _.pluck(data.crosstab, 'name'),
            data: _.pluck(data.crosstab, 'value'),
            xLabel: 'Market',
            yLabel: 'Total Weight (kg)',
            order: 2,
            message: data.message
        });
        charts.sort(function (a,b) { return a-b;})
    });
}

function fish_weight_by_province($http, charts, start_date, end_date, slug) {
    var url = ['/reports/crosstab', slug, 'province-purchased-caught', 'total-weight'].join('/');
        url = url + '?startdate=' + start_date;
        url = url + '&enddate=' + end_date;

    return $http.get(url).success(function(data) {
        charts.push({
            title: "Total Fish Weight by Province",
            type: data.type,
            labels: _.pluck(data.crosstab, 'name'),
            data: _.pluck(data.crosstab, 'value'),
            xLabel: 'Province',
            yLabel: 'Total Weight (kg)',
            order: 3,
            message: data.message
        });
        charts.sort(function (a,b) { return a-b;})
    });

}

angular.module('askApp')
    .controller('RespondantListCtrl', function($scope, $http, $routeParams) {

    $scope.filter = null;
    $scope.viewPath = app.viewPath;

    $scope.$watch('filter', function (newValue) {
        if (newValue) {
            $scope.charts = [];
            $scope.getRespondents();

            var start_date = $scope.filter.startDate.toString('yyyyMMdd');
            var end_date = $scope.filter.endDate.toString('yyyyMMdd')

            fish_weight_by_market($http, $scope.charts, start_date, end_date,
                $routeParams.surveySlug)

            fish_weight_by_province($http, $scope.charts, start_date, end_date,
                $routeParams.surveySlug);

            url = ['/reports/crosstab', $routeParams.surveySlug, 'survey-site', 'cost'].join('/');
                url = url + '?startdate=' + $scope.filter.startDate.toString('yyyyMMdd');
                url = url + '&enddate=' + $scope.filter.endDate.toString('yyyyMMdd');

            $http.get(url).success(function(data) {
                $scope.charts.push({
                    title: "Average Trip Costs by Market",
                    labels: _.pluck(data.crosstab, 'name'),
                    seriesNames: data.seriesNames,
                    type: data.type,
                    data: data.crosstab,
                    xLabel: 'Market',
                    yLabel: 'Average Trip Costs',
                    order: 1,
                    message: data.message
                });
                $scope.charts.sort(function (a,b) { return a-b;})

            });

            _.find($scope.survey.questions, function(x) { return x.slug == 'survey-site'; });

            url = ['/reports/crosstab', $routeParams.surveySlug, 'survey-site', 'total-weight'].join('/');
            url = url + '?startdate=' + $scope.filter.startDate.toString('yyyyMMdd');
            url = url + '&enddate=' + $scope.filter.endDate.toString('yyyyMMdd');
            url = url + '&group=week';
            $http.get(url).success(function(data) {
                $scope.charts.push({
                    title: "Total Weight for Week by Market",
                    labels: _.pluck(data.crosstab, 'name'),
                    seriesNames: data.seriesNames,
                    type: data.type,
                    data: data.crosstab,
                    xLabel: 'Market',
                    yLabel: 'Total Weight (kg)',
                    order: 4,
                    startDate: $scope.filter.startDate,
                    endDate: $scope.filter.endDate,
                    message: data.message
                });
                $scope.charts.sort(function (a,b) { return a-b;})
            });
        }

    }, true);



    $http.get('/api/v1/surveyreport/' + $routeParams.surveySlug + '/?format=json').success(function(data) {
        data.questions.reverse();
        $scope.survey = data;
        $scope.filter = {
            startDate: new Date($scope.survey.response_date_start).add(-1).day(),
            endDate: new Date($scope.survey.response_date_end).add(1).day(),
        }


        _.each($scope.survey.questions, function (question) {
            // save a reference to filter questions which are specified by uri
            question.filters = {};
            if (question.visualize && question.filter_questions) {
                question.filterQuestions = [];
                _.each(question.filter_questions, function (filterQuestion) {
                    question.filterQuestions.push($scope.getQuestionByUri(filterQuestion));
                });

            }
        });


    }).success(function() {

    });

    $scope.getRespondents = function (url) {
        $scope.respondentsLoading = true;
        if (! url) {
            url = '/api/v1/reportrespondant/?format=json&limit=10&survey__slug__exact=' + $routeParams.surveySlug;
        }

        if ($scope.filter.startDate) {
            url = url + '&ts__gte=' + $scope.filter.startDate.toString('yyyy-MM-dd')
        }
        if ($scope.filter.endDate) {
            url = url + '&ts__lte=' + $scope.filter.endDate.toString('yyyy-MM-dd')
        }

        $http.get(url).success(function(data) {
            $scope.respondentsLoading = false;
            $scope.respondents = data.objects;
            $scope.meta = data.meta;
        });
    }


    $scope.getQuestionByUri = function (uri) {
        return _.findWhere($scope.survey.questions, {'resource_uri': uri});
    };

    $scope.getQuestionBySlug = function (slug) {
        return _.findWhere($scope.survey.questions, {'slug': slug});
    };
});
