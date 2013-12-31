
angular.module('askApp').filter('validDate', ['$filter', function($filter) {
    return function(input, options) {
        if (angular.isUndefined(input) || _.isNull(input)) return '';

        // IE8 and lower can't parse ISO strings into dates. See this
        // Stack Overflow question: http://stackoverflow.com/a/17593482
        var inputString;

        if (_.isNumber(input)) {
            inputString = input;
        } else {
          inputString = input.split('.')[0];  
        } 
        if ($("html").is(".lt-ie9")) {
            var s = inputString.split(/\D/);
            var date = new Date.parse(Date.UTC(s[0], --s[1]||'', s[2]||'', s[3]||'', s[4]||'', s[5]||'', s[6]||''));
            return date.toString(options);
        }
        return (new Date.parse(inputString)).toString(options);
    }
}]);
