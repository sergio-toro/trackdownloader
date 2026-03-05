<?xml version="1.0" encoding="utf-8"?>
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
        Parameters with attribute select="0" will not show in the dialog window,
        but are added computationally.
  -->
  <xsl:param name="status">Provisional</xsl:param>
  <xsl:param name="task_id" select="0"></xsl:param>
  <xsl:param name="result_id" select="0"></xsl:param>

  <!-- the FsTask element for the given task (lots of info under there that we need) -->
  <xsl:variable name="task" select="/Fs/FsCompetition[1]/FsTasks/FsTask[@id=$task_id]"/>
  <xsl:variable name="task_result" select="$task/FsTaskResults[1]/FsTaskResult[@id=$result_id]"/>

  <!--  The node-set that this variable returns is what is used to create the result list. -->
  <xsl:variable name="task_participants_results" select="$task_result/FsTaskResultParticipants/FsTaskParticipantResult"/>

  <!-- all participants in the comp -->
  <xsl:variable name="comp_pilots" select="/Fs/FsCompetition[1]/FsParticipants[1]/FsParticipant"/>

  <!-- task score parameter -->
  <xsl:variable name="task_score_parameter" select="$task_result/FsTaskScoreParams"/>

  <!-- various stuff we need later ... -->
  <xsl:variable name="title" select="$task_result/@report_title"/>
  <xsl:variable name="result_pattern" select="$task_result/@result_pattern"/>
  <xsl:variable name="timestamp" select="$task_result/@ts"/>
  <xsl:variable name="tp1_open" select="$task/FsTaskDefinition/FsTurnpoint/@open"/>
  <xsl:variable name="task_name" select="$task/@name"/>
  <xsl:variable name="use_leading_points" select="$task/FsScoreFormula/@use_leading_points"/>
  <xsl:variable name="use_departure_points" select="$task/FsScoreFormula/@use_departure_points"/>
  <xsl:variable name="use_arrival_position_points" select="$task/FsScoreFormula/@use_arrival_position_points"/>
  <xsl:variable name="use_arrival_time_points" select="$task/FsScoreFormula/@use_arrival_time_points"/>
  <xsl:variable name="use_arrival_altitude_points" select="$task/FsScoreFormula/@use_arrival_altitude_points"/>
  <xsl:variable name="altitude_bonus_factor" select="$task/FsScoreFormula/@altitude_bonus_factor"/>
  <xsl:variable name="ss" select="$task/FsTaskDefinition/@ss"/>
  <xsl:variable name="es" select="$task/FsTaskDefinition/@es"/>
  <xsl:variable name="goal_altitude" select="$task/FsTaskState/@goal_altitude"/>
  <xsl:variable name="task_state" select="$task/FsTaskState/@task_state"/>
  <xsl:variable name="cancel_reason" select="$task/FsTaskState/@cancel_reason"/>
  <xsl:variable name="stop_time" select="$task/FsTaskState/@stop_time"/>
  <xsl:variable name="score_back_time" select="$task/FsTaskState/@score_back_time"/>
  <xsl:variable name="max_time_en_route" select="$task_score_parameter/@max_time_en_route"/>
  <xsl:variable name="max_time_en_route_tp" select="$task_score_parameter/@max_time_en_route_tp"/>
  <xsl:variable name="task_distance" select="$task_score_parameter/@task_distance"/>
  <xsl:variable name="ss_distance" select="$task_score_parameter/@ss_distance"/>
  <xsl:variable name="FsScoreFormula" select="$task/FsScoreFormula"/>
  <xsl:variable name="bonus_gr" select="$task/FsScoreFormula/@bonus_gr"/>
  <xsl:variable name="no_of_startgates" select="count($task/FsTaskDefinition/FsStartGate)"/>
  <xsl:variable name="fai_sanctioning" select="/Fs/FsCompetition[1]/@fai_sanctioning"/>
  <xsl:variable name="use_ltr" select="$task/FsScoreFormula/@use_leading_time_ratio"/>
  <xsl:variable name="ltr" select="$task/FsTaskDefinition/@leading_time_ratio"/>

  <!-- list of startgates -->
  <xsl:template name="FsStartGate_list">
    <xsl:text>Start gates: </xsl:text>
    <xsl:value-of select="substring($task/FsTaskDefinition/FsStartGate[1]/@open, 12, 5)"/>
    <xsl:for-each select="$task/FsTaskDefinition/FsStartGate[position() > 1]">
      <xsl:text>, </xsl:text>
      <xsl:value-of select="substring(@open, 12, 5)"/>
    </xsl:for-each>
  </xsl:template>

  <!-- list of scoring formula parameters -->
  <xsl:template name="FsScoreFormula_list">
    <h3>Scoring formula settings</h3>
    <table class="fs_res">
      <thead>
        <tr>
          <th class="fs_res">param</th>
          <th class="fs_res">value</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="$FsScoreFormula/@*">
          <tr>
            <td class="fs_res">
              <xsl:value-of select="name()"/>
            </td>
            <td class="fs_res" align="right">
              <xsl:value-of select="."/>
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

  <!-- task statistics (all sort of intermediate values used to calculate the score of each pilot) -->
  <xsl:template name="FsTaskScoreParams_list">
    <h3>Task statistics</h3>
    <table class="fs_res">
      <thead>
        <tr>
          <th class="fs_res">param</th>
          <th class="fs_res">value</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="$task_score_parameter/@*">
          <tr>
            <td class="fs_res">
              <xsl:value-of select="name()"/>
            </td>
            <td class="fs_res" align="right">
              <xsl:value-of select="."/>
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

  <!-- list pilots with penalties applied to score -->
  <xsl:template name="Penalty_list">
    <h3>Penalties</h3>
    <i>Note: % penalty is used to calc penalty as a % of total score. Both types can be combined. None affect the scoring of other pilots.</i>
    <table class="fs_res">
      <thead>
        <tr>
          <th class="fs_res">Id</th>
          <th class="fs_res">Name</th>
          <th class="fs_res">% penalty</th>
          <th class="fs_res">points penalty</th>
          <th class="fs_res">Reason</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="$task_participants_results">
          <xsl:sort select="@id" data-type="number" />
          <xsl:variable name="pilot_id" select="@id"/>
          <xsl:variable name="penalty" select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsResultPenalty/@penalty"/>
          <xsl:variable name="penalty_points_auto" select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsResult/@penalty_points_auto"/>
          <xsl:variable name="penalty_points" select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsResultPenalty/@penalty_points"/>
          <xsl:if test="$penalty != 0 or $penalty_points != 0">
            <tr>
              <td class="fs_res" align="right">
                <xsl:value-of select="$pilot_id"/>
              </td>
              <td class="fs_res">
                <xsl:value-of select="//FsCompetition[1]/FsParticipants[1]/FsParticipant[@id=$pilot_id]/@name"/>
              </td>
              <td class="fs_res" align="right">
                <xsl:value-of select="$penalty * 100"/>%
              </td>
              <td class="fs_res" align="right">
                <xsl:value-of select="$penalty_points"/>
              </td>
              <td class="fs_res">
                <xsl:value-of select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsResultPenalty/@penalty_reason"/>
              </td>
            </tr>
          </xsl:if>
          <xsl:if test="$penalty_points_auto != 0">
            <tr>
              <td class="fs_res" align="right">
                <xsl:value-of select="$pilot_id"/>
              </td>
              <td class="fs_res">
                <xsl:value-of select="//FsCompetition[1]/FsParticipants[1]/FsParticipant[@id=$pilot_id]/@name"/>
              </td>
              <td class="fs_res">
              </td>
              <td class="fs_res" align="right">
                <xsl:value-of select="round($penalty_points_auto)"/>
              </td>
              <td class="fs_res">
                <xsl:value-of select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsResult/@penalty_reason_auto"/>
              </td>
            </tr>
          </xsl:if>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

  <!-- NYP pilots -->
  <xsl:template name="NYP_pilots">
    <xsl:variable name="has_nyp">
      <xsl:for-each select="//FsCompetition[1]/FsParticipants[1]/FsParticipant">
        <xsl:variable name="pilot_id" select="@id"/>
        <xsl:if test="boolean($task/FsParticipants[1]/FsParticipant[@id=$pilot_id]) = false()">
          <xsl:value-of select="1"/>
        </xsl:if>
      </xsl:for-each>
    </xsl:variable>
    <xsl:if test="$has_nyp != ''">
      <div class="fs_res" style="page-break-before: always;">
        <h3>Pilots not yet processed (NYP)</h3>
        <table class="fs_res">
          <thead>
            <tr>
              <th class="fs_res">Id</th>
              <th class="fs_res">Name</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="//FsCompetition[1]/FsParticipants[1]/FsParticipant">
              <xsl:sort select="@id" data-type="number" />
              <xsl:variable name="pilot_id" select="@id"/>
              <xsl:if test="boolean($task/FsParticipants[1]/FsParticipant[@id=$pilot_id]) = false()">
                <tr>
                  <td class="fs_res" align="right">
                    <xsl:value-of select="$pilot_id"/>
                  </td>
                  <td class="fs_res">
                    <xsl:value-of select="//FsCompetition[1]/FsParticipants[1]/FsParticipant[@id=$pilot_id]/@name"/>
                  </td>
                </tr>
              </xsl:if>
            </xsl:for-each>
          </tbody>
        </table>
      </div>
    </xsl:if>
  </xsl:template>

  <!-- list pilots with notes -->
  <xsl:template name="Notes_list">
    <h3>Notes</h3>
    <table class="fs_res">
      <thead>
        <tr>
          <th class="fs_res">Id</th>
          <th class="fs_res">Name</th>
          <th class="fs_res">Note</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="$task_participants_results">
          <xsl:sort select="@id"/>
          <xsl:variable name="pilot_id" select="@id"/>
          <xsl:variable name="note" select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsFlightDataNote/@note"/>
          <xsl:if test="$note != ''">
            <tr>
              <td class="fs_res" align="right">
                <xsl:value-of select="$pilot_id"/>
              </td>
              <td class="fs_res">
                <xsl:value-of select="//FsCompetition[1]/FsParticipants[1]/FsParticipant[@id=$pilot_id]/@name"/>
              </td>
              <td class="fs_res">
                <xsl:value-of select="$note"/>
              </td>
            </tr>
          </xsl:if>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

  <xsl:template name="turnpointlist">
    <h3>Task definition</h3>
    <table class="fs_res">
      <thead>
        <tr>
          <th class="fs_res">No</th>
          <th class="fs_res">Leg Dist.</th>
          <th class="fs_res">Id</th>
          <th class="fs_res">Radius</th>
          <!--th>Type</th-->
          <th class="fs_res">Open</th>
          <th class="fs_res">Close</th>
          <th class="fs_res">Coordinates</th>
          <th class="fs_res">Altitude</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="$task/FsTaskDefinition/FsTurnpoint">
          <tr>
            <xsl:variable name="position" select="position()"/>
            <xsl:variable name="FsTaskDistToTp"
                      select="$task_score_parameter/FsTaskDistToTp[@tp_no=$position]"/>
            <td class="fs_res">
              <xsl:value-of select="$FsTaskDistToTp/@tp_no"/>
              <xsl:if test="$FsTaskDistToTp/@tp_no=$ss">
                <xsl:text> SS</xsl:text>
              </xsl:if>
              <xsl:if test="$FsTaskDistToTp/@tp_no=$es">
                <xsl:text> ES</xsl:text>
              </xsl:if>
            </td>
            <td class="fs_res" align="right">
              <xsl:value-of select="format-number($FsTaskDistToTp/@distance, concat('#0', $decimal_separator, '0'))"/> km
              <!--xsl:value-of select="$FsTaskDistToTp/@distance"/-->
            </td>
            <td class="fs_res">
              <xsl:value-of select="@id"/>
            </td>
            <td class="fs_res" align="right">
              <xsl:value-of select="@radius"/> m
            </td>
            <!--td>
              <xsl:value-of select="@type"/>
            </td-->
            <!--
              @open and @close expected on the form: open="2007-05-17T14:00:00+02:00" close="2007-05-17T18:30:00+02:00"
              We only want to show the local time (no date)
            -->
            <td class="fs_res">
              <xsl:value-of select="substring(@open, 12, 5)"/>
            </td>
            <td class="fs_res">
              <xsl:value-of select="substring(@close, 12, 5)"/>
            </td>
            <td class="fs_res">
              <xsl:choose>
                <xsl:when test="@utm_zone">
                  <xsl:text> </xsl:text>
                  <xsl:value-of select="@utm_zone"/>
                  &#160;<xsl:value-of select="@lon"/>
                  &#160;<xsl:value-of select="@lat"/>
                </xsl:when>
                <xsl:otherwise>
                  Lat: <xsl:value-of select="@lat"/> Lon: <xsl:value-of select="@lon"/>
                </xsl:otherwise>
              </xsl:choose>
            </td>
            <td class="fs_res" align="right">
              <xsl:value-of select="@altitude"/> m
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </xsl:template>

  <!-- Result list heading row -->
  <xsl:template name="result_heading_row">
    <tr>
      <th class="fs_res">#</th>
      <th class="fs_res">Id</th>
      <th class="fs_res">Name</th>
      <th class="fs_res"></th>
      <th class="fs_res">Nat</th>
      <th class="fs_res">Glider</th>
      <th class="fs_res">Sponsor</th>
      <!-- If Race or Elapsed time? -->
      <xsl:if test="$es != ''">
        <th class="fs_res">SS</th>
        <th class="fs_res">ES</th>
        <th class="fs_res">
          Time<br/>[h:m:s]
        </th>
        <th class="fs_res">
          Speed<br/>[km/h]
        </th>
      </xsl:if>
      <!-- Stopped task? -->
      <xsl:choose>
        <xsl:when test="$task_state = 'STOPPED' and $bonus_gr > 0">
          <th class="fs_res">
            Distance<br/>[km]
          </th>
          <th class="fs_res">
            Altitude<br/>[m]
          </th>
          <th class="fs_res">
            Adj. Distance<br/>[km]
          </th>
        </xsl:when>
        <xsl:otherwise>
          <th class="fs_res">
            Distance<br/>[km]
          </th>
        </xsl:otherwise>
      </xsl:choose>
      <th class="fs_res">
        Dist.<br/>Points
      </th>
      <xsl:if test="$use_leading_points=1">
        <th class="fs_res">
          Lead.<br/>Points
        </th>
      </xsl:if>
      <xsl:if test="$use_departure_points=1">
        <th class="fs_res">
          Dept.<br/>Points
        </th>
      </xsl:if>
      <th class="fs_res">
        Time<br/>Points
      </th>
      <xsl:if test="$use_arrival_time_points=1">
        <th class="fs_res">
          Arr.<br/>Time<br/>Points
        </th>
      </xsl:if>
      <xsl:if test="$use_arrival_position_points=1">
        <th class="fs_res">
          Arr.<br/>Pos.<br/>Points
        </th>
      </xsl:if>
      <xsl:if test="$use_arrival_altitude_points=1">
        <th class="fs_res">
          Arr.<br/>Alt.<br/>Points
        </th>
      </xsl:if>
      <th class="fs_res">Total</th>
    </tr>
  </xsl:template>

  <!--  Result list row.
        node-set elements must have @id and @points attributes and be sorted descending on @points.
        Gets other data from the $comp_pilots and $task variables.
  -->
  <xsl:template name="result_row">
    <tr class="fs_res_res_row" onmouseover="this.className = 'hover'" onmouseout="this.className='fs_res_res_row'" >
      <xsl:variable name="pilot_id" select="@id"/>
      <!-- General pilot info (name, nation, etc ...) -->
      <xsl:variable name="comp_pilot" select="$comp_pilots[@id=$pilot_id]"/>
      <!-- Info about the pilot's task performance (distance, time, etc ...) given by the scoring program. -->
      <xsl:variable name="task_participant_performance" select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsResult"/>
      <xsl:variable name="reached_goal" select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsFlightData/@reachedGoal"/>
      <td class="fs_res" align="right">
        <xsl:choose>
          <xsl:when test="not(@no_distance)">
            <xsl:value-of select="@rank"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="@no_distance"/>
          </xsl:otherwise>
        </xsl:choose>
      </td>
      <td class="fs_res">
        <xsl:value-of select="@id"/>
      </td>
      <td class="fs_res">
        <xsl:value-of select="$comp_pilot/@name"/>
      </td>
      <td class="fs_res">
        <xsl:choose>
          <xsl:when test="$comp_pilot/@female=1">F</xsl:when>
          <xsl:otherwise>M</xsl:otherwise>
        </xsl:choose>
      </td>
      <td class="fs_res">
        <xsl:value-of select="$comp_pilot/@nat_code_3166_a3"/>
      </td>
      <td class="fs_res">
        <xsl:value-of select="$comp_pilot/@glider"/>
      </td>
      <td class="fs_res">
        <xsl:value-of select="$comp_pilot/@sponsor"/>
      </td>
      <!-- If Race or Elapsed time? -->
      <xsl:if test="$es != ''">
        <td class="fs_res">
          <xsl:value-of select="substring($task_participant_performance/@started_ss, 12, 8)"/>
        </td>
        <td class="fs_res">
          <xsl:choose>
            <xsl:when test="$reached_goal = '1'">
              <xsl:value-of select="substring($task_participant_performance/@finished_ss, 12, 8)"/>
            </xsl:when>
            <xsl:otherwise>
              <del>
                <xsl:value-of select="substring($task_participant_performance/@finished_ss, 12, 8)"/>
              </del>
            </xsl:otherwise>
          </xsl:choose>
        </td>
        <td class="fs_res">
          <xsl:if test="$task_participant_performance/@finished_ss != ''">
            <xsl:choose>
              <xsl:when test="$reached_goal = '1'">
                <xsl:value-of select="$task_participant_performance/@ss_time"/>
              </xsl:when>
              <xsl:otherwise>
                <del>
                  <xsl:value-of select="$task_participant_performance/@ss_time"/>
                </del>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:if>
        </td>
        <td class="fs_res" align="right">
          <xsl:if test="$task_participant_performance/@finished_ss != ''">
            <xsl:choose>
              <xsl:when test="$reached_goal = '1'">
                <xsl:value-of select="format-number($ss_distance div $task_participant_performance/@ss_time_dec_hours, concat('#0', $decimal_separator, '0'))"/>
              </xsl:when>
              <xsl:otherwise>
                <del>
                  <xsl:value-of select="format-number($ss_distance div $task_participant_performance/@ss_time_dec_hours, concat('#0', $decimal_separator, '0'))"/>
                </del>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:if>
        </td>
      </xsl:if>
      <xsl:if test="$task_state = 'STOPPED' and $bonus_gr > 0">
        <td class="fs_res" align="right">
          <xsl:choose>
            <xsl:when test="@no_distance">
              <xsl:value-of select="@no_distance"/>
            </xsl:when>
            <xsl:otherwise>
              <xsl:value-of select="format-number($task_participant_performance/@real_distance, concat('#0', $decimal_separator, '00'))"/>
            </xsl:otherwise>
          </xsl:choose>
        </td>
        <td class="fs_res" align="right">
          <xsl:choose>
            <xsl:when test="$task_participant_performance/@landed_before_stop = 'True'">
              0
            </xsl:when>
            <xsl:when test="@no_distance"/>
            <xsl:otherwise>
              <xsl:if test="$task_participant_performance/@last_altitude_above_goal > 0">+</xsl:if>
              <xsl:value-of select="$task_participant_performance/@last_altitude_above_goal"/>
            </xsl:otherwise>
          </xsl:choose>
        </td>
      </xsl:if>
      <td class="fs_res" align="right">
        <xsl:if test="not(@no_distance)">
          <xsl:value-of select="format-number($task_participant_performance/@distance, concat('#0', $decimal_separator, '00'))"/>
        </xsl:if>
      </td>
      <td class="fs_res" align="right">
        <xsl:if test="not(@no_distance)">
          <xsl:value-of select="format-number(@distance_points, concat('#0', $decimal_separator, '0'))"/>
        </xsl:if>
      </td>
      <xsl:if test="$use_leading_points=1">
        <td class="fs_res" align="right">
          <xsl:if test="@leading_points != 0">
            <xsl:value-of select="format-number(@leading_points, concat('#0', $decimal_separator, '0'))"/>
          </xsl:if>
        </td>
      </xsl:if>
      <xsl:if test="$use_departure_points=1">
        <td class="fs_res" align="right">
          <xsl:if test="@departure_points != 0">
            <xsl:value-of select="format-number(@departure_points, concat('#0', $decimal_separator, '0'))"/>
          </xsl:if>
        </td>
      </xsl:if>
      <td class="fs_res" align="right">
        <xsl:if test="@time_points != 0">
          <xsl:value-of select="format-number(@time_points, concat('#0', $decimal_separator, '0'))"/>
        </xsl:if>
      </td>
      <xsl:if test="$use_arrival_time_points=1">
        <td class="fs_res" align="right">
          <xsl:if test="@arrival_points != 0">
            <xsl:value-of select="format-number(@arrival_points, concat('#0', $decimal_separator, '0'))"/>
          </xsl:if>
        </td>
      </xsl:if>
      <xsl:if test="$use_arrival_position_points=1">
        <td class="fs_res" align="right">
          <xsl:if test="@arrival_points != 0">
            <xsl:value-of select="format-number(@arrival_points, concat('#0', $decimal_separator, '0'))"/>
          </xsl:if>
        </td>
      </xsl:if>
      <xsl:if test="$use_arrival_altitude_points=1">
        <td class="fs_res" align="right">
          <xsl:if test="@arrival_points != 0">
            <xsl:value-of select="format-number(@arrival_points, concat('#0', $decimal_separator, '0'))"/>
          </xsl:if>
        </td>
      </xsl:if>
      <td class="fs_res" align="right">
        <xsl:variable name="penalty" select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsResult/@penalty"/>
        <xsl:variable name="penalty_points_auto" select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsResult/@penalty_points_auto"/>
        <xsl:variable name="penalty_points" select="$task/FsParticipants[1]/FsParticipant[@id=$pilot_id]/FsResult/@penalty_points"/>
        <xsl:choose>
          <xsl:when test="$penalty > 0 or $penalty_points > 0 or $penalty_points_auto > 0">
            <span style="color:red">
              <xsl:value-of select="format-number(@points, $result_pattern)"/>
            </span>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="format-number(@points, $result_pattern)"/>
          </xsl:otherwise>
        </xsl:choose>
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
          tr.fs_res_res_row:hover
          {
          background: yellow;
          }
          div.fs_res
          {
          font-family: Verdana, Arial, Helvetica, sans-serif;
          font-size: xx-small;
          }
          table.fs_res
          {
          border:solid 1px gray;
          border-collapse:collapse;
          font-size: xx-small;
          }
          td.fs_res
          {
          border:solid 1px gray;
          vertical-align:top;
          padding:5px;
          }
          th.fs_res
          {
          border:solid 1px gray;
          vertical-align:center;
          }
          table, tr, th, td {page-break-inside: avoid;}
        </style>
      </head>
      <body>
        <div>
          <div class="fs_res">
            <img src="http://fs.fai.org/wp-content/uploads/2018/07/civl-logo.png"/>
            <h1>
              <xsl:value-of select="/Fs/FsCompetition[1]/@name"/>
            </h1>
            <p style="font-size:xx-small">
              <xsl:value-of select="/Fs/FsCompetition[1]/@from"/> to <xsl:value-of select="/Fs/FsCompetition[1]/@to"/>
              <xsl:choose>
                <xsl:when test="$fai_sanctioning = '1'">,&#160;FAI Category 1 event</xsl:when>
                <xsl:when test="$fai_sanctioning = '2'">,&#160;FAI Category 2 event</xsl:when>
                <xsl:otherwise>,&#160;no FAI sanctioning</xsl:otherwise>
              </xsl:choose>
            </p>
            <xsl:if test="string-length($title) > 0">
              <h2>
                <xsl:value-of select="$title"/>
              </h2>
            </xsl:if>
            <h3>
              <xsl:value-of select="substring($tp1_open, 1, 10)"/>&#160;
              <xsl:choose>
                <xsl:when test="$es and $no_of_startgates > 0">
                  <xsl:text>Race to Goal</xsl:text>
                </xsl:when>
                <xsl:when test="$es and $no_of_startgates = 0">
                  <xsl:text>Elapsed time</xsl:text>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:text>Open Distance</xsl:text>
                </xsl:otherwise>
              </xsl:choose>
              <xsl:if test="$es != ''">
                <xsl:text>&#160;</xsl:text>
                <xsl:value-of select="format-number($task_distance, concat('#0', $decimal_separator, '0'))"/>
                <xsl:text> km</xsl:text>
              </xsl:if>
              <xsl:choose>
                <xsl:when test="$task_state = 'STOPPED'">
                  &#160;-&#160;Stopped&#160;at&#160;<xsl:value-of select="substring($stop_time, 12, 5)"/>
                  <xsl:if test="$score_back_time > 0">
                    &#160;(scored back by <xsl:value-of select="$score_back_time"/> min.<xsl:if test="$max_time_en_route_tp > 0">
                      ,&#160;maximum race time is <xsl:value-of select="$max_time_en_route"/>
                    </xsl:if>)
                  </xsl:if>
                </xsl:when>
                <xsl:when test="$task_state = 'CANCELLED'">
                  &#160;-&#160;Cancelled:&#160;<xsl:value-of select="$cancel_reason"/>
                </xsl:when>
                <xsl:otherwise/>
              </xsl:choose>
            </h3>
            <p>
              <xsl:value-of select="$status"/>
            </p>
            <!-- result list -->
            <table class="fs_res">
              <!-- headings -->
              <thead style="display: table-header-group;">
                <xsl:call-template name="result_heading_row"/>
              </thead>
              <!-- loop through the filtered list of pilots -->
              <xsl:for-each select="$task_participants_results">
                <xsl:call-template name="result_row"/>
              </xsl:for-each>
            </table>
            <xsl:if test="not($result_id = 'overall')">
              <p>
                Results include only those pilots where <xsl:value-of select="$result_id"/>
              </p>
            </xsl:if>
            <br/>
            <xsl:call-template name="turnpointlist"/>
            <xsl:if test="$no_of_startgates > 1">
              <xsl:call-template name="FsStartGate_list"/>
            </xsl:if>
            <!-- leading time ratio -->
            <xsl:if test="$use_ltr = 1">
              <p>
                Leading-time ratio: <xsl:value-of select="$ltr * 100"/>%
              </p>
            </xsl:if>
            <!-- List of pilots with notes -->
            <xsl:if test="count($task_participants_results[@has_note=1]) > 0">
              <xsl:call-template name="Notes_list"/>
            </xsl:if>
            <!-- List of pilots with penalties -->
            <xsl:if test="count($task_participants_results[@has_penalty=1]) > 0">
              <xsl:call-template name="Penalty_list"/>
            </xsl:if>

            <!-- List NYP pilots -->
            <xsl:call-template name="NYP_pilots"/>

            <!-- task statistics and scoring formula on a new page -->
            <div class="fs_res" style="page-break-before: always;">
              <xsl:call-template name="FsTaskScoreParams_list"/>
              <xsl:call-template name="FsScoreFormula_list"/>
            </div>
          </div>
          <div class="fs_res" style="width:100%;font-size: xx-small;" >
            <i>
              Report created: <xsl:value-of select="$timestamp"/>
            </i>
          </div>
          <div class="fs_res" style="width:100%;font-size: x-small;" >
            <p>
              FS development, maintenance and support by <a href="https://www.volirium.com" target="_new">
                <img width="100" src="http://fs.fai.org/wp-content/uploads/2018/07/volirium-logo.png"/>
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>