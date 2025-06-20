import time
import logging
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Runs the analyze_feedback command in a loop with a configurable sleep interval.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=getattr(settings, 'FEEDBACK_ANALYSIS_INTERVAL_SECONDS', 60 * 60 * 3), # Default to 3 hours
            help='Sleep interval in seconds between feedback analysis runs.'
        )
        parser.add_argument(
            '--run-once',
            action='store_true',
            help='Run the analysis once and exit (for testing).'
        )

    def handle(self, *args, **options):
        interval = options['interval']
        run_once = options['run_once']

        self.stdout.write(self.style.SUCCESS(
            f'Starting feedback analyzer loop. Interval: {interval} seconds.'
        ))
        logger.info(f'Feedback analyzer loop started. Interval: {interval}s')

        while True:
            self.stdout.write(self.style.HTTP_INFO(f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] Running analyze_feedback command...'))
            logger.info('Calling analyze_feedback command.')
            try:
                call_command('analyze_feedback')
                self.stdout.write(self.style.SUCCESS(
                    f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] analyze_feedback command finished successfully.'
                ))
                logger.info('analyze_feedback command finished successfully.')
            except Exception as e:
                self.stderr.write(self.style.ERROR(
                    f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] Error running analyze_feedback: {e}'
                ))
                logger.exception('Error calling analyze_feedback command.')

            if run_once:
                self.stdout.write(self.style.WARNING('Ran once, exiting due to --run-once flag.'))
                logger.info('Exiting after one run due to --run-once flag.')
                break

            self.stdout.write(self.style.HTTP_INFO(
                f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] Sleeping for {interval} seconds...'
            ))
            logger.info(f'Sleeping for {interval} seconds.')
            time.sleep(interval)
