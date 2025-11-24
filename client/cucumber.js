export default {
    default: {
        // Updated paths to match actual project structure
        paths: ['client/features/**/*.feature'],
        require: ['client/features/step_definitions/**/*.js', 'client/features/support/**/*.js'],
        format: ['progress-bar', ['html', 'cucumber-report.html']],
    }
};
