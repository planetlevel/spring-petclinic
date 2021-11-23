// end-to-end.js created with Cypress


describe('home', () => {
    it('Visits home page', () => {
      cy.visit('/')
    })
  })

  describe('owners', () => {
    it('Visits find owners page', () => {
      cy.visit('/owners/find')
    })
  })

describe('search', () => {
    it('Searches for new owners', () => {
        cy.visit('/owners/find');
        cy.url().should('contains', '/owners/find');
        cy.get('#lastName').type('Joe Developer');
        cy.get('.btn:nth-child(1)').click();
        cy.url().should('contains', '/owners');
    })
})

describe('new owner', () => {
    it('Add new owner', () => {
        cy.visit('/owners/new');
        cy.url().should('contains', '/owners/new');
        cy.get('#firstName').click();
        cy.get('#firstName').type('Jeff');
        cy.get('#lastName').type('Williams');
        cy.get('#address').type('1313 Mockingbird Lane');
        cy.get('#city').type('Beverly Hills');
        cy.get('#telephone').type('1231231234');
        cy.get('.btn').click();
    })
})

describe('new pet (existing owner)', () => {
    it('Adds new pet', () => {
        cy.visit('/owners/2/pets/new');
        cy.url().should('contains', '/owners/2/pets/new');
        cy.get('#name').type('Birdie');
        cy.get('#birthDate').type('1999-19-10');
        cy.get('#type').select('cat');
        cy.get('.btn').click();
        cy.url().should('contains', '/owners/2');
    })
})

describe('new pet (new owner)', () => {
    it('Add new pet', () => {
        cy.visit('/owners/11/pets/new');
        cy.url().should('contains', '/owners/11/pets/new');
        cy.get('#name').type('catty');
        cy.get('#birthDate').type('1999-10-10');
        cy.get('#type').select('dog');
        cy.get('.btn').click();
        cy.url().should('contains', '/owners/11');
    })
})

describe('edit owner', () => {
    it('Edits owner details', () => {
        cy.visit('/owners/find');
        cy.get('#lastName').type('davis');
        cy.get('.btn:nth-child(1)').click();
        cy.visit('/owners/2/edit');
        cy.get('#telephone').click();
        cy.get('#telephone').clear();
        cy.get('#telephone').type('6085551748');
        cy.get('.btn').click();
        cy.url().should('contains', '/owners/2');
    })
})

describe('edit pet', () => {
    it('Edits pet details', () => {
        cy.visit('/owners/2/pets/2/edit');
        cy.url().should('contains', '/owners/2/pets/2/edit');
        cy.get('#name').click();
        cy.get('#name').type('Birdie');
        cy.get('#birthDate').type('1999-19-10');
        cy.get('#type').select('lizard');
        cy.get('.btn').click();
        cy.url().should('contains', '/owners/2/pets/2/edit');
        cy.get('#birthDate').click();
        cy.get('.btn').click();
        cy.url().should('contains', '/owners/2/pets/2/edit');
        cy.get('#birthDate').click();
        cy.get('.btn').click();
        cy.url().should('contains', '/owners/2');
    })
})


describe('visits', () => {
    it('Add new visits home page', () => {
        cy.visit('/owners/2/pets/2/visits/new');
        cy.url().should('contains', '/owners/2/pets/2/visits/new');
        cy.get('#description').click();
        cy.get('#description').type('visit 1');
        cy.get('.btn').click();
        cy.url().should('contains', '/owners/2');
        cy.visit('/owners/2/pets/2/visits/new');
        cy.url().should('contains', '/owners/2/pets/2/visits/new');
        cy.get('#description').click();
        cy.get('#description').type('visit 2');
        cy.get('.btn').click();
        cy.url().should('contains', '/owners/2');
    })
})

describe('list', () => {
    it('Lists vets', () => {
        cy.visit('/vets.html');
        cy.url().should('contains', '/vets.html');
        cy.request('/vets.xml');
    })
})

describe('error', () => {
    it('Visits error page', () => {
        cy.request({url:' /oups',failOnStatusCode: false});
    })
})

describe('home', () => {
    it('Visits home page', () => {
        cy.visit('/');
    })
})

describe('manage', () => {
    it('Visit management pages', () => {
        cy.request( {url: '/manage/auditevents'})
        cy.request( {url: '/manage/auditevents.json'})
        cy.request( {url: '/manage/autoconfig'})
        cy.request( {url: '/manage/autoconfig.json'})
        cy.request( {url: '/manage/beans'})
        cy.request( {url: '/manage/beans.json'})
        cy.request( {url: '/manage/configprops'})
        cy.request( {url: '/manage/configprops.json'})
        cy.request( {url: '/manage/dump'})
        cy.request( {url: '/manage/dump.json'})
        cy.request( {url: '/manage/env'})
        cy.request( {url: '/manage/env/local.server.port'})
        cy.request( {url: '/manage/env.json'})
        cy.request( {url: '/manage/health'})
        cy.request( {url: '/manage/health.json'})
        // cy.request( {url: '/manage/heapdump'})
        // cy.request( {url: '/manage/heapdump.json'})
        cy.request( {url: '/manage/info'})
        cy.request( {url: '/manage/info.json'})
        cy.request( {url: '/manage/loggers'})
        cy.request( {url: '/manage/loggers/ROOT',failOnStatusCode: false})
        cy.request( {method: 'POST',url: '/manage/loggers/ROOT', headers: {'Content-Type': 'application/json'}, body: "{'configuredLevel': 'TRACE'}", failOnStatusCode: false} )
        cy.request( {url: '/manage/loggers.json'})
        cy.request( {url: '/manage/mappings'})
        cy.request( {url: '/manage/mappings.json'})
        cy.request( {url: '/manage/metrics'})
        cy.request( {url: '/manage/metrics/mem'})
        cy.request( {url: '/manage/metrics.json'})
        cy.request( {url: '/manage/trace'})
        cy.request( {url: '/manage/trace.json'})
    });
})

