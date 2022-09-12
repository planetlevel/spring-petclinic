// end-to-end.js created with Cypress


describe('home', () => {
    it('Visits home page', () => {
      cy.visit('http://localhost:8080')
    })
  })

  describe('owners', () => {
    it('Visits find owners page', () => {
      cy.visit('http://localhost:8080/owners/find')
    })
  })

describe('search', () => {
    it('Searches for new owners', () => {
        cy.visit('http://localhost:8080/owners/find');
        cy.url().should('contains', 'http://localhost:8080/owners/find');
        cy.get('#lastName').click();
        cy.get('#lastName').type('Joe Developer');
        cy.get('.btn:nth-child(1)').click();
        cy.url().should('contains', 'http://localhost:8080/owners');
    })
})

describe('new owner', () => {
    it('Add new owner', () => {
        cy.visit('http://localhost:8080/owners/new');
        cy.url().should('contains', 'http://localhost:8080/owners/new');
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
        cy.visit('http://localhost:8080/owners/2/pets/new');
        cy.url().should('contains', 'http://localhost:8080/owners/2/pets/new');
        cy.get('#name').type('Birdie');
        cy.get('#birthDate').type('1999-19-10');
        cy.get('#type').select('cat');
        cy.get('.btn').click();
        cy.url().should('contains', 'http://localhost:8080/owners/2');
    })
})

describe('new pet (new owner)', () => {
    it('Add new pet', () => {
        cy.visit('http://localhost:8080/owners/11/pets/new');
        cy.url().should('contains', 'http://localhost:8080/owners/11/pets/new');
        cy.get('#name').type('catty');
        cy.get('#birthDate').type('1999-10-10');
        cy.get('#type').select('dog');
        cy.get('.btn').click();
        cy.url().should('contains', 'http://localhost:8080/owners/11');
    })
})

describe('edit owner', () => {
    it('Edits owner details', () => {
        cy.visit('http://localhost:8080/owners/find');
        cy.get('#lastName').type('davis');
        cy.get('.btn:nth-child(1)').click();
        cy.visit('http://localhost:8080/owners/2/edit');
        cy.get('#telephone').click();
        cy.get('#telephone').clear();
        cy.get('#telephone').type('6085551748');
        cy.get('.btn').click();
        cy.url().should('contains', 'http://localhost:8080/owners/2');
    })
})

describe('edit pet', () => {
    it('Edits pet details', () => {
        cy.visit('http://localhost:8080/owners/2/pets/2/edit');
        cy.url().should('contains', 'http://localhost:8080/owners/2/pets/2/edit');
        cy.get('#name').click();
        cy.get('#name').type('Birdie');
        cy.get('#birthDate').type('1999-19-10');
        cy.get('#type').select('lizard');
        cy.get('.btn').click();
        cy.url().should('contains', 'http://localhost:8080/owners/2/pets/2/edit');
        cy.get('#birthDate').click();
        cy.get('.btn').click();
        cy.url().should('contains', 'http://localhost:8080/owners/2/pets/2/edit');
        cy.get('#birthDate').click();
        cy.get('.btn').click();
        cy.url().should('contains', 'http://localhost:8080/owners/2');
    })
})


describe('visits', () => {
    it('Add new visits home page', () => {
        cy.visit('http://localhost:8080/owners/2/pets/2/visits/new');
        cy.url().should('contains', 'http://localhost:8080/owners/2/pets/2/visits/new');
        cy.get('#description').click();
        cy.get('#description').type('visit 1');
        cy.get('.btn').click();
        cy.url().should('contains', 'http://localhost:8080/owners/2');
        cy.visit('http://localhost:8080/owners/2/pets/2/visits/new');
        cy.url().should('contains', 'http://localhost:8080/owners/2/pets/2/visits/new');
        cy.get('#description').click();
        cy.get('#description').type('visit 2');
        cy.get('.btn').click();
        cy.url().should('contains', 'http://localhost:8080/owners/2');
    })
})

describe('list', () => {
    it('Lists vets', () => {
        cy.visit('http://localhost:8080/vets.html');
        cy.url().should('contains', 'http://localhost:8080/vets.html');
        cy.request('http://localhost:8080/vets.xml');
    })
})

describe('error', () => {
    it('Visits error page', () => {
        cy.visit({url:' http://localhost:8080/oups',failOnStatusCode: false});
    })
})

describe('home', () => {
    it('Visits home page', () => {
        cy.visit('http://localhost:8080/');
    })
})

describe('manage', () => {
    it('Visit management pages', () => {
        cy.request( {url: 'http://localhost:8080/manage/auditevents'})
        cy.request( {url: 'http://localhost:8080/manage/auditevents.json'})
        cy.request( {url: 'http://localhost:8080/manage/autoconfig'})
        cy.request( {url: 'http://localhost:8080/manage/autoconfig.json'})
        cy.request( {url: 'http://localhost:8080/manage/beans'})
        cy.request( {url: 'http://localhost:8080/manage/beans.json'})
        cy.request( {url: 'http://localhost:8080/manage/configprops'})
        cy.request( {url: 'http://localhost:8080/manage/configprops.json'})
        cy.request( {url: 'http://localhost:8080/manage/dump'})
        cy.request( {url: 'http://localhost:8080/manage/dump.json'})
        cy.request( {url: 'http://localhost:8080/manage/env'})
        cy.request( {url: 'http://localhost:8080/manage/env/local.server.port'})
        cy.request( {url: 'http://localhost:8080/manage/env.json'})
        cy.request( {url: 'http://localhost:8080/manage/health'})
        cy.request( {url: 'http://localhost:8080/manage/health.json'})
        // cy.request( {url: 'http://localhost:8080/manage/heapdump'})
        // cy.request( {url: 'http://localhost:8080/manage/heapdump.json'})
        cy.request( {url: 'http://localhost:8080/manage/info'})
        cy.request( {url: 'http://localhost:8080/manage/info.json'})
        cy.request( {url: 'http://localhost:8080/manage/loggers'})
        cy.request( {url: 'http://localhost:8080/manage/loggers/ROOT',failOnStatusCode: false})
        cy.request( {method: 'POST',url: 'http://localhost:8080/manage/loggers/ROOT', headers: {'Content-Type': 'application/json'}, body: "{'configuredLevel': 'TRACE'}", failOnStatusCode: false} )
        cy.request( {url: 'http://localhost:8080/manage/loggers.json'})
        cy.request( {url: 'http://localhost:8080/manage/mappings'})
        cy.request( {url: 'http://localhost:8080/manage/mappings.json'})
        cy.request( {url: 'http://localhost:8080/manage/metrics'})
        cy.request( {url: 'http://localhost:8080/manage/metrics/mem'})
        cy.request( {url: 'http://localhost:8080/manage/metrics.json'})
        cy.request( {url: 'http://localhost:8080/manage/trace'})
        cy.request( {url: 'http://localhost:8080/manage/trace.json'})
    });
})






// ============ CONTRAST SECURITY TESTS ============= //

before(() => {
    cy.request( {
        method: 'GET',
        url: 'https://eval.contrastsecurity.com/Contrast/api/ng/d3b189b6-c17d-46e8-b56e-4ba40794630e/applications/59165dd5-e5e7-44a8-bc73-ce0e4649dc4c?expand=scores,license,trace_breakdown,coverage,app_instrumentation_protect,skip_links',
        url: 'https://eval.contrastsecurity.com/Contrast/api/ng/6a3073a5-5e68-40e5-9d7d-165340fff15a/applications/8337557f-f3d7-4895-88f5-55894d3fbdc1?expand=scores,license,trace_breakdown,coverage,app_instrumentation_protect,skip_links',
        headers : {
            'Authorization': 'ZGVtby51c2VyQGNvbnRyYXN0c2VjdXJpdHkuY29tOlFQNUNXSUQzM0RSTUtOVjc=',
            'Api-Key': 'IMDq4X0K8BzCvwUt3iEyn0TV4Ti3loMD',
            'Content-Type': 'application/json',
            "facets": []
        }
    }).then((response) => {
        Cypress.env('CONTRAST_APPNAME',response.body.application.name)
        Cypress.env('CONTRAST_SECURITY',parseInt(response.body.application.scores.security.grade))
        Cypress.env('CONTRAST_LIBRARIES',parseInt(response.body.application.scores.platform.grade))
        Cypress.env('CONTRAST_COVERAGE',100 * parseFloat(response.body.application.routes.exercised) / parseFloat(response.body.application.routes.discovered))
    });
})

describe('Contrast appname check', () => {
    it( 'Verifies appname is set correctly', () => {
        expect(Cypress.env('CONTRAST_APPNAME')).to.eq('PetClinic-JW');
    });
})

describe('Contrast security check', () => {
    it( 'Verifies security score >= 80', () => {
        expect(Cypress.env('CONTRAST_SECURITY')).to.gte(80);
    });
})

describe('Contrast library check', () => {
    it( 'Verifies library score >= 80', () => {
        expect(Cypress.env('CONTRAST_LIBRARIES')).to.gte(80);
    });
})

describe('Contrast route coverage check', () => {
    it( 'Verifies route coverage >= 60', () => {
        expect(Cypress.env('CONTRAST_COVERAGE')).to.gte(60);
    });
})
