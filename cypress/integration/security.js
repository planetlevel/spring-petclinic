// ============ CONTRAST SECURITY TESTS ============= //

before(() => {
    cy.wait(5000)
    cy.request( {
        method: 'GET',
        url: Cypress.env('contrast-url') + '/api/ng/' + Cypress.env('contrast-org') + '/applications/' + Cypress.env('contrast-app') + '?expand=scores,coverage,skip_links',
        headers : {
            'Authorization': Cypress.env('contrast-auth'),
            'Api-Key': Cypress.env('contrast-api-key'),
            'Content-Type': 'application/json',
        }
    }).then((response) => {
        Cypress.env('CONTRAST_APPNAME',response.body.application.name)
        // minutes since Contrast saw activity from this app
        Cypress.env('CONTRAST_ELAPSED', ( new Date().getTime() - response.body.application.last_seen ) / ( 1000 * 60 ) )
        Cypress.env('CONTRAST_SECURITY',parseInt(response.body.application.scores.security.grade))
        Cypress.env('CONTRAST_LIBRARIES',parseInt(response.body.application.scores.platform.grade))
        Cypress.env('CONTRAST_COVERAGE',100 * parseFloat(response.body.application.routes.exercised) / parseFloat(response.body.application.routes.discovered))
    });
})

describe('Contrast appname check', () => {
    it( 'Verifies appname is set correctly', () => {
        expect(Cypress.env('CONTRAST_APPNAME')).to.eq('spring-petclinic');
    });
})

describe('Contrast engaged', () => {
    it( 'Verifies Contrast saw app in last 20 minutes', () => {
        expect(Cypress.env('CONTRAST_ELAPSED')).to.lt(20);
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
