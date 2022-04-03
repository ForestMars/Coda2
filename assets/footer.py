# footer.py - module to dynamically generate a static footer.
__version__ = '0.1'
__all__ = ['get_header', 'get_menu']

import dash_html_components as html
import dash_dangerously_set_inner_html


def get_footer():
    footer = html.Div([
        dash_dangerously_set_inner_html.DangerouslySetInnerHTML('''

    '<!--=== Footer Version 1 ===-->
    <div class="footer-v1">
        <div class="footer">
            <div class="container">
                <div class="row">
                    <!-- About -->

                    <div class="col-md-3 md-margin-bottom-40">
                        <a href="/">

<!-- img id="logo-footer" class="footer-logo" src="logo.png" alt="" width="200px" -->
<br />
<!-- img id="logo-footer" class="footer-logo" src="logo.png" alt="" width="200px" -->
<div id="footer-logo-svg" style="text-align:center;">
  <img height="100%" id="logo-footer" class="footer-logo" src="assets/img/covid_circle.jpg" title="Covid Data Tools" alt="Covid Data Tools" />

</div>
</a>

                    </div><!--/col-md-3-->
                    <!-- End About -->




                    <!-- Link List -->
                    <div class="col-md-3">

                    </div><!--/col-md-3-->

                    <!-- Link List -->
                    <div class="col-md-3">
                        <div class="headline"><h2>Links</h2></div>
                        <ul class="list-unstyled link-list">
                            <li><a href="/about">About Us</a><i class="fa fa-angle-right"></i></li>
                            <!-- li><a href="/scope-and-sequence">Contribute</a><i class="fa fa-angle-right"></i></li -->
                            <li><a href="terms-of-service">Terms of Use</a><i class="fa fa-angle-right"></i></li>
                            <li><a href="privacy-policy">Privacy Policy</a><i class="fa fa-angle-right"></i></li>
                            <li><a href="/sitemap">Site Map</a><i class="fa fa-angle-right"></i></li>
                        </ul>
                    </div><!--/col-md-3-->

                    <!-- End Link List -->
                    <!-- Address -->


                    <div class="col-md-3 map-img md-margin-bottom-40">
                        <div class="headline"><h2>Contact</h2></div>
                        <address class="md-margin-bottom-40">
                            <a href="href="tel:3476887501" alt="347-688-7501" title="347-688-7501" class="">Phone</a><br />
                            <a href="mailto:coronapocalypse@gmail.com" class="">Email</a><br />
                            <a href="https://github.com/ForestMars/Coda.to" class="">Github</a><br />
                            <a href="http://twitter.com/codatatools" class="">Social</a>
                        </address>

                    </div><!--/col-md-3-->


                    <!-- End Address -->
                </div>
            </div>
        </div><!--/footer-->

        <div class="copyright">
            <div class="container">
                <div class="row">
                    <div class="col-md-18">
                        <p color="#ff0000"><br /><small><i>
                            © 2020 Coda.to, All Rights Reserved. “Coda.to” is a registered trademarks of Coda Computing LLC. Some Patents Pending.<a name="ngss-tm"></a> Covid Data Tools are free to use however no warranty whatsoever is intended or implied. Data sources are explicitly stated and no responsibility for the accuracy of the data is assumed. These tools are provided for collaboration and insight.
                            </i></small></p>
                    </div>

                </div>
            </div>
        </div><!--/copyright-->
    </div>
    <!--=== End Footer Version 1 ===-->




        '''),
    ],
)
    return footer



def get_footer_links():
    footer = html.Div([
        dash_dangerously_set_inner_html.DangerouslySetInnerHTML('''

    '<!--=== Footer Version 1 ===-->
    <div class="footer-v1">
        <div class="footer">
            <div class="container">
                <div class="row">
                    <!-- About -->

                    <div class="col-md-3 md-margin-bottom-40">
                        <a href="/">

<!-- img id="logo-footer" class="footer-logo" src="logo.png" alt="" width="200px" -->
<div id="footer-logo-svg">
  <img height="100%" id="logo-footer" class="footer-logo" src="dk-bkgrnd.svg" alt="">
</div>
</a>

                    </div><!--/col-md-3-->
                    <!-- End About -->

                    <!-- Link List -->
                    <div class="col-md-3 md-margin-bottom-40">
                        <div class="headline"><h2>Links</h2></div>
                        <ul class="list-unstyled link-list">
                            <li><a href="/about">About Us</a><i class="fa fa-angle-right"></i></li>
                            <!-- li><a href="/scope-and-sequence">Contribute</a><i class="fa fa-angle-right"></i></li -->
                            <li><a href="terms-of-service">Terms of Use</a><i class="fa fa-angle-right"></i></li>
                            <li><a href="privacy-policy">Privacy Policy</a><i class="fa fa-angle-right"></i></li>
                            <li><a href="/sitemap">Site Map</a><i class="fa fa-angle-right"></i></li>
                        </ul>
                    </div><!--/col-md-3-->
                    <!-- End Link List -->

                    <!-- Address -->
                    <div class="col-md-3 map-img md-margin-bottom-40">
                        <div class="headline"><h2>Contact</h2></div>
                        <address class="md-margin-bottom-40">
                            <a href="href="tel:3476887501" title="347-688-7501" class="">Phone</a><br />
                            <a href="mailto:coronapocalypse@gmail.com" class="">Email</a><br />
                            <a href="https://github.com/ForestMars/Coda.to" class="">Github</a><br />
                            <a href="http://twitter.com/codatatools" class="">Social</a>
                        </address>
                    </div><!--/col-md-3-->
                    <!-- End Address -->
                </div>
            </div>
        </div><!--/footer-->

    <!--=== Link Footer above /// TOS Footer below ===-->

        '''),
    ],
)
    return footer




def get_footer_tos():
    footer = html.Div([
        dash_dangerously_set_inner_html.DangerouslySetInnerHTML('''

        <div class="copyright">
            <div class="container">
                <div class="row">
                    <div class="col-md-18">
                        <p color="#ff0000"><br /><small><i>
                            © 2020 Coda.to, All Rights Reserved. “Coda.to” is a registered trademarks of Coda Computing LLC. Some Patents Pending.<a name="ngss-tm"></a> Covid Data Tools are free to use however no warranty whatsoever is intended or implied. Data sources are explicitly stated and no responsibility for the accuracy of the data is assumed. These tools are provided for collaboration and insight.
                            </i></small></p>
                    </div>

                </div>
            </div>
        </div><!--/copyright-->
    </div>
    <!--=== End Footer Version 1 ===-->


        '''),
    ],
)
    return footer
