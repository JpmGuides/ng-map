import { NgMapPage } from './app.po';

describe('ng-map App', function() {
  let page: NgMapPage;

  beforeEach(() => {
    page = new NgMapPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
