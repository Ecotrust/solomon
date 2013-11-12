//'use strict';

angular.module('askApp')
    .controller('CrossTabCtrl', function($scope, $http, $routeParams, $location) {

    $http.get(['/reports/crosstab', $routeParams.surveySlug, $routeParams.questionSlugX, $routeParams.questionSlugY].join('/')).success(function(data) {
        $scope.chart = {
            labels: _.pluck(data.crosstab, 'name'),
            data: _.pluck(data.crosstab, 'value'),
            xLabel: $routeParams.questionSlugX,
            yLabel: $routeParams.questionSlugY
        }
    });
});