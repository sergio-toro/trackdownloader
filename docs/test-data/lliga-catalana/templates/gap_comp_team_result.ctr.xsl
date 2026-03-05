<?xml version="1.0" encoding="utf-8"?>
<!-- Template for competition team results -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <!--  To see the input used for this xslt, check the "Create source.xml file 
        when creating report" menu item under the "Reports" menu in FsComp.
        When checked a .source.xml file is created each time you create a report.
        It shows the actual xml input to the xslt processor.
        This is helpfull if you like to modify this file.
  -->

  <xsl:output method="html" encoding="utf-8" indent="yes" />

  <!--  Set the decimal separator to be used (. or ,) when decimal data is displayed.
        All decimal data in the source is with . and will be displayed with . unless
        formated otherwise using format-number() function.
  -->
  <xsl:variable name="decimal_separator" select="'.'"/>
  <xsl:decimal-format decimal-separator='.' grouping-separator=' ' />
  <!-- note! make sure both above use same, ie either . or ,!! -->

  <!--  All <xsl:param ... elements will show as a field in a report dialog in 
        FS when creating reports. This means you can define param elements here 
        with a default value and set the value from FS when creating report.
        Some is used simply to display text at the top of the report (ie status), 
        others is used to filter the results (ie women_only, nation, ...).
        If you add filter params you must of course also change the "filter"
        definition below so that the filter params is applied.
  -->
  <xsl:param name="status">Provisional</xsl:param>
  <xsl:param name="result_id" select="0"></xsl:param>
  <xsl:param name="tasks" select="0"></xsl:param>

  <!--  The node-set that this variable returns is what is used 
        to create the result list.
        Here some of the params above is used.
        NOTE: for team report it does not seem like there is any sort of filter
        that makes sense to apply the FsTeamResults element, so we select all of it.
  -->
  <xsl:variable name="filter" select="/Fs/FsCompetition/FsTeamResults/FsTeamResult[@id=$result_id and @tasks=$tasks]"/>

  <xsl:variable name="title" select="$filter/@report_title"/>
  <xsl:variable name="fai_sanctioning" select="/Fs/FsCompetition[1]/@fai_sanctioning"/>
  <xsl:variable name="discard_factor" select="/Fs/FsCompetition[1]/@ftv_factor"/>
  <xsl:variable name="task_result_pattern" select="$filter/@task_result_pattern"/>
  <xsl:variable name="comp_result_pattern" select="$filter/@comp_result_pattern"/>


  <!-- list of tasks -->
  <xsl:template name="FsTask_list">
    <table class="fs_res">
      <thead>
        <tr class="fs_res_res_row" onmouseover="this.className = 'hover'" onmouseout="this.className='fs_res_res_row'" >
          <th class="fs_res">Task</th>
          <th class="fs_res">Date</th>
          <th class="fs_res">
            Distance [km]
          </th>
          <th class="fs_res">
            <xsl:if test="$discard_factor > 0">
              FTV Validity
            </xsl:if>
            <xsl:if test="$discard_factor &lt;= 0">
              Day Quality
            </xsl:if>
          </th>
          <th class="fs_res">Type</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="$filter/FsTeam[1]/FsParticipant[1]/FsTask">
          <xsl:variable name="task_id" select="@id"/>
          <xsl:variable name="es" select="/Fs/FsCompetition/FsTasks/FsTask[@id=$task_id]/FsTaskDefinition/@es"/>
          <xsl:variable name="no_of_startgates" select="count(/Fs/FsCompetition/FsTasks/FsTask[@id=$task_id]/FsTaskDefinition/FsStartGate)"/>
          <xsl:variable name="task_distance" select="/Fs/FsCompetition/FsTasks/FsTask[@id=$task_id]/FsTaskScoreParams/@task_distance"/>
          <xsl:variable name="task_day_quality" select="/Fs/FsCompetition/FsTasks/FsTask[@id=$task_id]/FsTaskScoreParams/@day_quality"/>
          <xsl:variable name="task_ftv_validity" select="/Fs/FsCompetition/FsTasks/FsTask[@id=$task_id]/FsTaskScoreParams/@ftv_day_validity"/>
          <tr class="fs_res_res_row" onmouseover="this.className = 'hover'" onmouseout="this.className='fs_res_res_row'" >
            <td class="fs_res">
              T<xsl:value-of select="position()"/>
              <xsl:text>&#160;</xsl:text>
              <xsl:value-of select="/Fs/FsCompetition/FsTasks/FsTask[@id=$task_id]/@name"/>
            </td>
            <td class="fs_res">
              <xsl:value-of select="translate(substring(/Fs/FsCompetition/FsTasks/FsTask[@id=$task_id]/FsTaskDefinition/FsTurnpoint[1]/@open, 1, 10), 'T', ' ')"/>&#160;&#160;<xsl:value-of select="@name"/>
            </td>
            <td class="fs_res" align="right">
              <xsl:if test="$es">
                <xsl:text>&#160;</xsl:text>
                <xsl:value-of select="format-number($task_distance, concat('#0', $decimal_separator, '0'))"/>
              </xsl:if>
            </td>
            <td class="fs_res" align="right">
              <xsl:if test="$discard_factor > 0">
                <xsl:value-of select="format-number($task_ftv_validity, '#0.##%')"/>
              </xsl:if>
              <xsl:if test="$discard_factor &lt;= 0">
                <xsl:value-of select="format-number($task_day_quality, '#0.##%')"/>
              </xsl:if>
            </td>
            <td class="fs_res">
              <xsl:choose>
                <xsl:when test="$es and $no_of_startgates = 1">
                  <xsl:text>Race to goal</xsl:text>
                </xsl:when>
                <xsl:when test="$es and $no_of_startgates > 1">
                  <xsl:text>Race to goal with </xsl:text>
                  <xsl:value-of select="$no_of_startgates"/>
                  <xsl:text> start gates</xsl:text>
                </xsl:when>
                <xsl:when test="$es and $no_of_startgates = 0">
                  <xsl:text>Elapsed time</xsl:text>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:text>Open Distance</xsl:text>
                </xsl:otherwise>
              </xsl:choose>
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

  <!-- record template, used for each team-member -->
  <xsl:template name="record">
    <xsl:variable name="pilot_id" select="@id"/>
    <tr>
      <td>
      </td>
      <td>
        <xsl:value-of select="@id"/>
      </td>
      <td>
        <xsl:value-of select="/Fs/FsCompetition/FsParticipants/FsParticipant[@id=$pilot_id]/@name"/>
      </td>
      <td>
        <xsl:choose>
          <xsl:when test="/Fs/FsCompetition/FsParticipants/FsParticipant[@id=$pilot_id]/@female=1">F</xsl:when>
          <xsl:otherwise>M</xsl:otherwise>
        </xsl:choose>
      </td>
      <td>
        <xsl:value-of select="/Fs/FsCompetition/FsParticipants/FsParticipant[@id=$pilot_id]/@nat_code_3166_a3"/>
      </td>
      <td>
        <xsl:value-of select="/Fs/FsCompetition/FsParticipants/FsParticipant[@id=$pilot_id]/@glider"/>
      </td>
      <td>
        <xsl:value-of select="/Fs/FsCompetition/FsParticipants/FsParticipant[@id=$pilot_id]/@sponsor"/>
      </td>
      <xsl:for-each select="FsTask">
        <xsl:variable name="task_id" select="@id"/>
        <xsl:variable name="points">
          <xsl:choose>
            <xsl:when test="/Fs/FsCompetition/FsTasks/FsTask[@id=$task_id]/FsParticipants/FsParticipant[@id=$pilot_id]/FsResult">
              <xsl:value-of select="/Fs/FsCompetition/FsTasks/FsTask[@id=$task_id]/FsParticipants/FsParticipant[@id=$pilot_id]/FsResult/@points"/>
            </xsl:when>
            <xsl:otherwise>
              <xsl:value-of select="0"/>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:choose>
          <xsl:when test="@counts='1'">
            <td style="text-align: right">
              <xsl:value-of select="format-number($points, $task_result_pattern)"/>
            </td>
          </xsl:when>
          <xsl:otherwise>
            <td style="text-align: right; text-decoration: line-through;">
              <xsl:value-of select="format-number($points, $task_result_pattern)"/>
            </td>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
      <td>
      </td>
    </tr>
  </xsl:template>

  <!-- Main template. This is where it all starts. -->
  <xsl:template match="/">
    <xsl:text disable-output-escaping="yes">&lt;!DOCTYPE html&gt;</xsl:text>
    <html>
      <head>
        <style>
          .hover
          { /* for IE using onmouseover and onmouseout */
          background: yellow;
          }
          tr:hover {background: yellow;}
          body {
          font-family: Verdana, Arial, Helvetica, sans-serif;
          font-size: xx-small;
          }
          table
          {
          border:solid 1px gray;
          border-collapse:collapse;
          font-size: xx-small;
          }
          td
          {
          border:solid 1px gray;
          vertical-align:top;
          padding:5px;
          }
          th
          {
          border:solid 1px gray;
          vertical-align:center;
          }
          table, tr, th, td {page-break-inside: avoid;}
        </style>
      </head>
      <body>
        <img src="http://fs.fai.org/wp-content/uploads/2018/07/civl-logo.png"/>
        <h1>
          <xsl:value-of select="/Fs/FsCompetition/@name"/>
        </h1>
        <p style="font-size:xx-small">
          <xsl:value-of select="/Fs/FsCompetition/@from"/> to <xsl:value-of select="/Fs/FsCompetition/@to"/>
          <xsl:choose>
            <xsl:when test="$fai_sanctioning = '1'">,&#160;FAI Category 1 event</xsl:when>
            <xsl:when test="$fai_sanctioning = '2'">,&#160;FAI Category 2 event</xsl:when>
            <xsl:otherwise>,&#160;no FAI sanctioning</xsl:otherwise>
          </xsl:choose>
        </p>
        <h2>
          <xsl:value-of select="$title"/>
        </h2>
        <p>
          <xsl:value-of select="$status"/>
        </p>
        <br/>
        <xsl:call-template name="FsTask_list"></xsl:call-template>
        <br/>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Id</th>
              <th>Name</th>
              <th></th>
              <th>Nat</th>
              <th>Glider</th>
              <th>Sponsor</th>
              <xsl:for-each select="$filter/FsTeam[1]/FsParticipant[1]/FsTask">
                <th>
                  <xsl:text>T </xsl:text>
                  <xsl:value-of select="position()"/>
                </th>
              </xsl:for-each>
              <th>Total</th>
            </tr>
          </thead>

          <!-- for each team sorted ascending on rank -->
          <xsl:for-each select="$filter/FsTeam">
            <xsl:sort select="@points" data-type="number" order="descending"/>
            <!-- team row -->
            <tr>
              <td>
                <xsl:value-of select="@rank"/>
              </td>
              <td>
              </td>
              <td>
                <b>
                  <xsl:value-of select="@name"/>
                </b>
              </td>
              <td>
              </td>
              <td>
              </td>
              <td>
              </td>
              <td>
              </td>
              <!-- an empty cell for each task in team row -->
              <xsl:for-each select="$filter/FsTeam[1]/FsParticipant[1]/FsTask">
                <td></td>
              </xsl:for-each>
              <td align="right">
                <strong>
                  <xsl:value-of select="format-number(@points, $comp_result_pattern)"/>
                </strong>
              </td>
            </tr>

            <!-- for each team-member -->
            <!-- participant rows -->
            <xsl:for-each select="FsParticipant">
              <xsl:call-template name="record"/>
            </xsl:for-each>
          </xsl:for-each>
        </table>
        <div style="width:100%;font-size: xx-small;" >
          <i>
            Report created: <xsl:value-of select="$filter/@ts"/>
          </i>
        </div>
        <div class="fs_res" style="width:100%;font-size: x-small;" >
          <p>
            FS development, maintenance and support by <a href="https://www.volirium.com" target="_new">
              <img width="100" src="http://fs.fai.org/wp-content/uploads/2018/07/volirium-logo.png"/>
            </a>
          </p>
        </div>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
