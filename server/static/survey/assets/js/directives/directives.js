angular.module('askApp')
    .directive('printButton', function() {
            return {
                template: '<button id="print_button" class="btn btn-warning" ng-click="print()"><i class="icon-print"></i> Print</button>',
                restrict: 'EA',
                transclude: true,
                replace: true,
                link: function(scope) {
                    scope.print = function() { window.print(); };
                }
            }
        }
    );
angular.module('askApp')
    .directive('dateRangePicker', function() {

        return {
            template: '<div id="reportrange" ng-show="start" class="pull-right"><i class="icon-calendar icon-large"></i> <span>{{ start|validDate: "dd-MM-yyyy"  }} to {{ end|validDate: "dd-MM-yyyy" }}</span></div>',
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                min: "=min",
                max: "=max",
                start: "=start",
                end: "=end"

            },
            link: function(scope, element, attrs) {
                var min, max;
                var initializePicker = _.once(function(start, end) {
                    // element.val(_.string.sprintf("%s - %s", start, end));
                    element.daterangepicker({
                        format: 'DD-MM-YYYY',
                        startDate: start,
                        endDate: end,
                        minDate: start,
                        maxDate: end,
                        opens: 'left',
                        showDropdowns: true,
                        ranges: {
                            'Today': [moment(), moment()],
                            'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
                            'Last 7 Days': [moment().subtract('days', 6), moment()],
                            'Last 30 Days': [moment().subtract('days', 29), moment()],
                            'This Month': [moment().startOf('month'), moment().endOf('month')],
                            'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
                        }
                    }, function(start, end) {
                        scope.$apply(function(s) {
                            s.start = start;
                            s.end = end;
                        });
                    });
                });


                scope.$watch('min', function(newValue) {
                    if (newValue) {
                        min = (new Date(newValue)).toString('dd-MM-yyyy');
                        if (max && min) {
                            initializePicker(min, max);
                        }
                    }

                });
                scope.$watch('max', function(newValue) {
                    if (newValue) {
                        max = (new Date(newValue)).toString('dd-MM-yyyy');
                        if (max && min) {
                            initializePicker(min, max);
                        }
                    }
                });
            }
        }
    });


angular.module('askApp')
    .directive('timePicker', function() {

        return {
            template: '<input class="timepicker">',
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                answer: '=answer'
            },
            link: function(scope, element, attrs) {
                var scroller = element.scroller({
                    preset: 'time',
                    mode: 'clickpick',
                    // theme: 'android-ics light',
                    onSelect: function(date) {
                        scope.$apply(function(s) {
                            s.answer = date;
                        });
                    }
                });

                if (scope.answer) {
                    console.log(scope.answer);
                    scroller.scroller('setValue', scope.answer, true);
                }

            }
        }
    });
