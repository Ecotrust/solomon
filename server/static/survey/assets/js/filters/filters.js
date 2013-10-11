
angular.module('askApp').filter('validDate', ['$filter', function($filter) {
    return function(input, options) {
        if (angular.isUndefined(input)) return '';
        return (new Date(input)).toString(options);
    }
}]);
