// ============ CONTRAST SECURITY TESTS ============= //

before(() => {
    cy.wait(5000)
    cy.request( {
        method: 'GET',
        url: 'https://apptwo.contrastsecurity.com/Contrast/api/ng/d3b189b6-c17d-46e8-b56e-4ba40794630e/applications/c99a0823-4a0c-4817-97a9-22da5355b818?expand=scores,coverage,skip_links',
        headers : {
            'Authorization': 'amVmZi53aWxsaWFtc0Bjb250cmFzdHNlY3VyaXR5LmNvbTpXNjVTMDA1QzRFVTJIN0RG',
            'Api-Key': 'xXW5dwLccuENQz6f0k48BPVfKmnwya45',
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
