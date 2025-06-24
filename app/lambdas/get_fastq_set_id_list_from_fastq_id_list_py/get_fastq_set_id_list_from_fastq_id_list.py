#!/usr/bin/env python3

"""
Get fastq set id list from fastq id list.
"""

from orcabus_api_tools.fastq import get_fastq


def handler(event, context):
    """
    Get fastq set id list from fastq id list.
    :param event:
    :param context:
    :return:
    """

    fastq_id_list = event.get("fastqIdList", [])

    fastq_set_id_list = list(set(list(filter(
        lambda fastq_set_id: fastq_set_id is not None,
        list(map(
            lambda fastq_id: get_fastq(fastq_id).get("fastqSetId") if get_fastq(fastq_id) else None,
            fastq_id_list
        ))))
    ))

    return {
        "fastqSetIdList": fastq_set_id_list
    }
