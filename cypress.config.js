module.exports = {
  name: 'Using fixtures to represent data',
  email: 'hello@cypress.io',
  body: 'Fixtures are a great way to mock data for responses to routes',
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.js')(on, config)
    },
  },
}
